"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPermissao, exigirUsuario } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { errosDoZod, mensagemDeErro, type EstadoAcao } from "@/lib/acoes";
import type { Json } from "@/lib/supabase/database.types";
import { esquemaCliente, esquemaDadosPessoais, esquemaContato, esquemaInteresse } from "@/lib/clientes/esquemas";

function revalidar(id?: string) {
  revalidatePath("/clientes");
  revalidatePath("/clientes/funil");
  if (id) revalidatePath(`/clientes/${id}`);
}

export async function salvarCliente(_: EstadoAcao<{ id: string }>, fd: FormData): Promise<EstadoAcao<{ id: string }>> {
  const usuario = await exigirPermissao("clientes");
  const bruto = Object.fromEntries(fd) as Record<string, string>;
  const id = bruto.id || null;
  const cliente = esquemaCliente.safeParse(bruto);
  const pessoais = esquemaDadosPessoais.safeParse(bruto);
  const erros = { ...(cliente.success ? {} : errosDoZod(cliente.error)), ...(pessoais.success ? {} : errosDoZod(pessoais.error)) };
  if (!cliente.success || !pessoais.success) return { ok: false, erros, erro: "Confira os campos destacados." };

  const dados = { ...cliente.data };
  // Vendedor sempre fica como responsável pelos clientes que cadastra.
  if (usuario.papel === "vendedor") {
    if (id) delete (dados as Partial<typeof dados>).vendedor_id;
    else dados.vendedor_id = usuario.id;
  }

  const p = pessoais.data;
  const registro: Record<string, unknown> = {
    data_nascimento: p.data_nascimento,
    cep: p.cep,
    logradouro: p.logradouro,
    numero: p.numero,
    complemento: p.complemento,
    bairro: p.bairro,
    cidade: p.cidade_endereco,
    uf: p.uf_endereco,
  };
  // CPF só é alterado quando digitado (o campo vem vazio por padrão, já que não é exibido).
  if (p.cpf) registro.cpf = p.cpf;
  if (p.rg) registro.rg = p.rg;
  const temPessoais = Object.values(registro).some((v) => v !== null);

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("salvar_cliente", {
    p_id: id as string, // null = novo cliente
    p_cliente: dados as unknown as Json,
    p_pessoais: (temPessoais || id ? registro : null) as Json,
  });
  if (error || !data) {
    if ((error as { code?: string } | null)?.code === "23505") {
      return { ok: false, erros: { cpf: ["Este CPF já está cadastrado em outro cliente."] }, erro: "Este CPF já está cadastrado em outro cliente." };
    }
    return { ok: false, erro: mensagemDeErro(error) };
  }
  const salvo = { id: data };
  revalidar(salvo.id);
  return { ok: true, mensagem: id ? "Cliente atualizado." : "Cliente cadastrado.", dados: { id: salvo.id } };
}

export async function verificarTelefone(telefone: string) {
  await exigirPermissao("clientes");
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("cliente_existe", { p_telefone: telefone });
  return data ?? [];
}

export async function revelarCPF(clienteId: string): Promise<EstadoAcao<{ valor: string | null }>> {
  await exigirPermissao("clientes");
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("revelar_dado_pessoal", {
    p_cliente: clienteId,
    p_campo: "cpf",
    p_motivo: "Consulta na ficha do cliente",
  });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  return { ok: true, dados: { valor: data } };
}

export async function registrarContato(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const usuario = await exigirPermissao("clientes");
  const dados = esquemaContato.safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: "Confira o contato." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("clientes_contatos").insert({ ...dados.data, usuario_id: usuario.id });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  // Conversa registrada tira o cliente de "lead".
  await supabase.from("clientes").update({ etapa: "negociacao" }).eq("id", dados.data.cliente_id).eq("etapa", "lead");
  revalidar(dados.data.cliente_id);
  return { ok: true, mensagem: "Contato registrado." };
}

const esquemaEtapa = z
  .object({
    id: z.uuid(),
    etapa: z.enum(["lead", "negociacao", "ganho", "perdido"]),
    motivo_perda: z.preprocess(
      (v) => (v === "" ? null : v),
      z.enum(["preco", "financiamento_negado", "comprou_outro_lugar", "desistiu", "sem_contato", "carro_vendido", "outro"]).nullable().optional(),
    ),
    motivo_perda_detalhe: z.string().optional(),
  })
  .refine((d) => d.etapa !== "perdido" || d.motivo_perda, { path: ["motivo_perda"], message: "Informe o motivo da perda." });

export async function moverEtapa(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("clientes");
  const dados = esquemaEtapa.safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: dados.error.issues[0]?.message };
  const supabase = await criarClienteServidor();
  const perdido = dados.data.etapa === "perdido";
  const { error, count } = await supabase
    .from("clientes")
    .update(
      {
        etapa: dados.data.etapa,
        motivo_perda: perdido ? dados.data.motivo_perda ?? null : null,
        motivo_perda_detalhe: perdido ? dados.data.motivo_perda_detalhe || null : null,
      },
      { count: "exact" },
    )
    .eq("id", dados.data.id);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  if (!count) return { ok: false, erro: "Sem permissão para alterar este cliente." };
  revalidar(dados.data.id);
  return { ok: true, mensagem: "Etapa atualizada." };
}

export async function adicionarInteresse(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("clientes");
  const dados = esquemaInteresse.safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: dados.error.issues[0]?.message };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("clientes_interesses").insert(dados.data);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidar(dados.data.cliente_id);
  return { ok: true, mensagem: "Interesse registrado." };
}

export async function removerInteresse(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("clientes");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("clientes_interesses").update({ ativo: false }).eq("id", String(fd.get("id")));
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidar(String(fd.get("cliente_id")));
  return { ok: true };
}

export async function anonimizarCliente(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const u = await exigirUsuario();
  if (u.papel !== "dono") return { ok: false, erro: "Somente o dono pode anonimizar clientes." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("anonimizar_cliente", { p_cliente: String(fd.get("id")) });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidar(String(fd.get("id")));
  return { ok: true, mensagem: "Dados pessoais removidos (LGPD)." };
}

export async function excluirCliente(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("estoque.gerenciar");
  const supabase = await criarClienteServidor();
  const { error, count } = await supabase.from("clientes").delete({ count: "exact" }).eq("id", String(fd.get("id")));
  if (error) {
    return {
      ok: false,
      erro:
        (error as { code?: string }).code === "23503"
          ? "Cliente com vendas registradas não pode ser excluído. Use a anonimização (LGPD)."
          : mensagemDeErro(error),
    };
  }
  if (!count) return { ok: false, erro: "Sem permissão para excluir." };
  revalidar();
  return { ok: true, mensagem: "Cliente excluído." };
}
