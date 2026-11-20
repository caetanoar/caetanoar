"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirPermissao, exigirUsuario } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { criarClienteServidor } from "@/lib/supabase/server";
import { errosDoZod, mensagemDeErro, type EstadoAcao } from "@/lib/acoes";
import { normalizarPlaca, validarPlaca } from "@/lib/format/veiculo";
import { parseMoeda } from "@/lib/format/moeda";
import { provedorConsulta } from "@/lib/integracoes/consulta-veicular";
import { valorPorCodigo } from "@/lib/integracoes/fipe";
import { calcularSelo, semDadosPessoais } from "./regras";
import type { Json } from "@/lib/supabase/database.types";

type Retorno<T> = { ok: true; dados: T } | { ok: false; erro: string };

/**
 * Consulta externa da placa. Reaproveita a consulta ainda válida (cache) para não
 * pagar duas vezes, a menos que o usuário peça para atualizar.
 */
export async function consultarPlaca(placaDigitada: string, forcar = false): Promise<Retorno<{ id: string; cache: boolean }>> {
  const usuario = await exigirUsuario();
  if (!pode(usuario.papel, "placa.consultar")) return { ok: false, erro: "Seu perfil não faz consultas externas de placa." };
  const placa = normalizarPlaca(placaDigitada);
  if (!validarPlaca(placa)) return { ok: false, erro: "Placa inválida. Use o formato ABC1234 ou ABC1D23." };
  const supabase = await criarClienteServidor();

  if (!forcar) {
    const { data: vigente } = await supabase.from("consultas_veiculares").select("id").eq("placa", placa).neq("status", "erro")
      .gt("expira_em", new Date().toISOString()).order("consultado_em", { ascending: false }).limit(1).maybeSingle();
    if (vigente) return { ok: true, dados: { id: vigente.id, cache: true } };
  }

  const { data: bloqueio } = await supabase.rpc("consulta_disponivel");
  if (bloqueio) return { ok: false, erro: bloqueio };

  const provedor = provedorConsulta();
  let registro: Record<string, unknown>;
  let bruto: unknown = null;
  try {
    const r = await provedor.consultar(placa);
    const dados = { ...r.dados };
    // FIPE gratuita quando o provedor trouxer só o código.
    if (!dados.valor_fipe && dados.codigo_fipe && dados.ano_modelo) {
      const fipe = await valorPorCodigo(dados.codigo_fipe, dados.ano_modelo).catch(() => null);
      if (fipe) Object.assign(dados, { valor_fipe: fipe.valor, fipe_referencia: fipe.mesReferencia });
    }
    registro = {
      placa, provedor: provedor.nome, simulado: provedor.simulado, status: r.status, custo: r.custo ?? undefined,
      dados, verificacoes: r.verificacoes, selo: r.status === "encontrado" ? calcularSelo(r.verificacoes) : null,
    };
    bruto = semDadosPessoais(r.bruto);
  } catch (e) {
    registro = { placa, provedor: provedor.nome, simulado: provedor.simulado, status: "erro", erro: e instanceof Error ? e.message.slice(0, 300) : "Falha na consulta" };
  }

  const { data: id, error } = await supabase.rpc("registrar_consulta", { p_consulta: registro as Json, p_bruto: (bruto ?? undefined) as Json });
  if (error || !id) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath(`/placa/${placa}`);
  revalidatePath("/consultas");
  if (registro.status === "erro") return { ok: false, erro: `A consulta falhou: ${registro.erro}` };
  return { ok: true, dados: { id, cache: false } };
}

/** Campo de placa do topo: estoque primeiro; fora do estoque, consulta externa. */
export async function buscarPlaca(fd: FormData) {
  const usuario = await exigirUsuario();
  const placa = normalizarPlaca(String(fd.get("placa") ?? ""));
  if (!validarPlaca(placa)) redirect(`/placa?erro=placa`);
  const supabase = await criarClienteServidor();
  const { data: carro } = await supabase.from("veiculos").select("id").eq("placa", placa).limit(1).maybeSingle();
  if (!carro && pode(usuario.papel, "placa.consultar")) {
    const r = await consultarPlaca(placa);
    if (!r.ok) redirect(`/placa/${placa}?erro=${encodeURIComponent(r.erro)}`);
  }
  redirect(`/placa/${placa}`);
}

export async function atualizarConsulta(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const placa = String(fd.get("placa") ?? "");
  const r = await consultarPlaca(placa, true);
  if (!r.ok) return { ok: false, erro: r.erro };
  return { ok: true, mensagem: "Consulta atualizada." };
}

export async function consultarAgora(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const placa = String(fd.get("placa") ?? "");
  const r = await consultarPlaca(placa, false);
  if (!r.ok) return { ok: false, erro: r.erro };
  return { ok: true, mensagem: r.dados.cache ? "Usando a consulta ainda válida (sem custo)." : "Consulta feita." };
}

const esquemaConfig = z.object({
  consulta_custo_unitario: z.string().optional().transform((v) => parseMoeda(v) ?? 0).pipe(z.number().min(0).max(10000)),
  consulta_limite_mensal_qtd: z.string().trim().optional().transform((v) => (v ? Number(v) : null)).pipe(z.number().int().positive().nullable()),
  consulta_limite_mensal_valor: z.string().trim().optional().transform((v) => parseMoeda(v)).pipe(z.number().positive().nullable()),
  consulta_cache_dias: z.coerce.number().int().min(0).max(90),
  consulta_validade_venda_dias: z.coerce.number().int().min(1).max(90),
});

export async function salvarConfigConsulta(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("configuracoes");
  const bruto = Object.fromEntries(fd) as Record<string, string>;
  const dados = esquemaConfig.safeParse(bruto);
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: "Confira os campos." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("configuracoes").update(dados.data).eq("id", true);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath("/configuracoes/consulta-veicular");
  revalidatePath("/consultas");
  return { ok: true, mensagem: "Configuração da consulta salva." };
}
