"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { errosDoZod, mensagemDeErro, type EstadoAcao } from "@/lib/acoes";
import { esquemaVeiculo, esquemaSigilo, esquemaConsignacao, esquemaCusto, esquemaHistorico } from "@/lib/estoque/esquemas";
import type { Json } from "@/lib/supabase/database.types";
import { dispararWebhooks } from "@/lib/webhooks/entregar";

function revalidarVeiculo(id?: string) {
  revalidatePath("/estoque");
  if (id) revalidatePath(`/estoque/${id}`);
}

/** Cadastro/edição completa: veículo + dados sigilosos + consignação, numa transação só. */
export async function salvarVeiculo(_: EstadoAcao<{ id: string }>, fd: FormData): Promise<EstadoAcao<{ id: string }>> {
  await exigirPermissao("estoque.gerenciar");
  const bruto = Object.fromEntries(fd) as Record<string, string>;
  const id = bruto.id || null;

  const veiculo = esquemaVeiculo.safeParse(bruto);
  const sigilo = esquemaSigilo.safeParse(bruto);
  const consignacao =
    bruto.tipo === "consignado"
      ? esquemaConsignacao.safeParse({
          consignante_id: bruto.consignante_id,
          valor_minimo_dono: bruto.valor_minimo_dono,
          data_inicio: bruto.consignacao_inicio,
          data_fim: bruto.consignacao_fim,
          recebimento_padrao: bruto.recebimento_padrao,
          observacoes: bruto.consignacao_observacoes,
        })
      : null;

  const erros: Record<string, string[]> = {};
  if (!veiculo.success) Object.assign(erros, errosDoZod(veiculo.error));
  if (!sigilo.success) Object.assign(erros, errosDoZod(sigilo.error));
  if (consignacao && !consignacao.success) {
    const e = errosDoZod(consignacao.error);
    for (const [k, v] of Object.entries(e)) {
      const mapa: Record<string, string> = { data_inicio: "consignacao_inicio", data_fim: "consignacao_fim", observacoes: "consignacao_observacoes" };
      erros[mapa[k] ?? k] = v;
    }
  }
  if (veiculo.success && sigilo.success && sigilo.data.preco_minimo !== null) {
    const { preco_negociavel, preco_anunciado } = veiculo.data;
    const teto = preco_negociavel ?? preco_anunciado;
    if (teto !== null && sigilo.data.preco_minimo > teto) {
      erros.preco_minimo = ["O preço mínimo não pode ser maior que o negociável/anunciado."];
    }
  }
  if (Object.keys(erros).length > 0 || !veiculo.success || !sigilo.success) {
    return { ok: false, erros, erro: "Confira os campos destacados." };
  }

  const dadosVeiculo: Record<string, unknown> = { ...veiculo.data };
  if (id) {
    // Status de carro existente muda pelas ações próprias (devolução, venda).
    delete dadosVeiculo.status;
  }
  if (!dadosVeiculo.data_entrada) delete dadosVeiculo.data_entrada;

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc("salvar_veiculo", {
    p_id: id as string, // null = novo veículo
    p_veiculo: dadosVeiculo as Json,
    p_sigilo: sigilo.data as Json,
    p_consignacao: consignacao?.success ? (Object.fromEntries(Object.entries(consignacao.data).filter(([, v]) => v !== null)) as Json) : undefined,
  });
  if (error || !data) return { ok: false, erro: mensagemDeErro(error) };
  // Cadastro feito a partir de uma consulta de placa: liga a consulta ao carro.
  if (!id && /^[0-9a-f-]{36}$/i.test(bruto.consulta_id ?? "")) {
    await supabase.from("consultas_veiculares").update({ veiculo_id: data }).eq("id", bruto.consulta_id);
  }
  revalidarVeiculo(data);
  dispararWebhooks();
  return { ok: true, mensagem: id ? "Veículo atualizado." : "Veículo cadastrado.", dados: { id: data } };
}

export async function alterarStatus(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("estoque.gerenciar");
  const dados = z
    .object({
      id: z.uuid(),
      status: z.enum(["em_preparacao", "disponivel", "reservado", "devolvido"]),
      motivo: z.string().optional(),
    })
    .safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erro: "Dados inválidos." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("alterar_status_veiculo", {
    p_id: dados.data.id,
    p_status: dados.data.status,
    p_motivo: dados.data.motivo || undefined,
  });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidarVeiculo(dados.data.id);
  dispararWebhooks();
  return { ok: true, mensagem: "Status atualizado." };
}

export async function excluirVeiculo(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("estoque.gerenciar");
  const id = String(fd.get("id") ?? "");
  const supabase = await criarClienteServidor();
  const { data: fotos } = await supabase.from("arquivos").select("bucket, path").eq("entidade", "veiculo").eq("entidade_id", id);
  const { error, count } = await supabase.from("veiculos").delete({ count: "exact" }).eq("id", id);
  if (error) {
    if ((error as { code?: string }).code === "23503") {
      return { ok: false, erro: "Este carro tem venda ou lançamentos vinculados e não pode ser excluído." };
    }
    return { ok: false, erro: mensagemDeErro(error) };
  }
  if (!count) return { ok: false, erro: "Você não tem permissão para excluir este veículo." };
  // Remove os arquivos do Storage e o índice
  for (const bucket of new Set((fotos ?? []).map((f) => f.bucket))) {
    await supabase.storage.from(bucket).remove((fotos ?? []).filter((f) => f.bucket === bucket).map((f) => f.path));
  }
  await supabase.from("arquivos").delete().eq("entidade", "veiculo").eq("entidade_id", id);
  revalidarVeiculo();
  return { ok: true, mensagem: "Veículo excluído." };
}

// ---------------------------------------------------------------------------
// Custos de preparação
// ---------------------------------------------------------------------------
export async function salvarCusto(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("estoque.sigilo");
  const dados = esquemaCusto.safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: "Confira os campos." };
  const supabase = await criarClienteServidor();
  const registro = { ...dados.data, data: dados.data.data ?? undefined, valor: dados.data.valor as number };
  const { error } = await supabase.from("custos_veiculo").insert(registro);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidarVeiculo(dados.data.veiculo_id);
  return { ok: true, mensagem: "Custo lançado." };
}

export async function excluirCusto(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("estoque.sigilo");
  const id = String(fd.get("id") ?? "");
  const veiculoId = String(fd.get("veiculo_id") ?? "");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("custos_veiculo").delete().eq("id", id);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidarVeiculo(veiculoId);
  return { ok: true, mensagem: "Custo removido." };
}

// ---------------------------------------------------------------------------
// Itens e histórico
// ---------------------------------------------------------------------------
export async function adicionarItem(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("estoque.gerenciar");
  const dados = z
    .object({
      veiculo_id: z.uuid(),
      item: z.string().trim().min(2, "Descreva o item."),
      categoria: z.string().optional(),
      confirmado: z.preprocess((v) => v === "true" || v === "on", z.boolean()),
      fonte: z.preprocess((v) => (v === "" ? null : v), z.enum(["vistoria", "documento", "dono", "outro"]).nullable().optional()),
    })
    .safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: "Confira o item." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("veiculo_itens").insert({ ...dados.data, categoria: dados.data.categoria || null, fonte: dados.data.fonte ?? null });
  if (error) return { ok: false, erro: (error as { code?: string }).code === "23505" ? "Este item já está no carro." : mensagemDeErro(error) };
  revalidarVeiculo(dados.data.veiculo_id);
  return { ok: true };
}

export async function alternarItem(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("estoque.gerenciar");
  const id = String(fd.get("id"));
  const veiculoId = String(fd.get("veiculo_id"));
  const acao = String(fd.get("acao"));
  const supabase = await criarClienteServidor();
  const { error } =
    acao === "remover"
      ? await supabase.from("veiculo_itens").delete().eq("id", id)
      : await supabase.from("veiculo_itens").update({ confirmado: acao === "confirmar" }).eq("id", id);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidarVeiculo(veiculoId);
  return { ok: true };
}

export async function salvarHistorico(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("estoque.gerenciar");
  const dados = esquemaHistorico.safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: "Confira o histórico." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("veiculo_historico").insert({ ...dados.data, data: dados.data.data ?? undefined });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidarVeiculo(dados.data.veiculo_id);
  return { ok: true, mensagem: "Histórico registrado." };
}

export async function excluirHistorico(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("estoque.gerenciar");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("veiculo_historico").delete().eq("id", String(fd.get("id")));
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidarVeiculo(String(fd.get("veiculo_id")));
  return { ok: true, mensagem: "Histórico removido." };
}

// ---------------------------------------------------------------------------
// Arquivos (fotos e documentos): o upload vai direto do celular ao Storage;
// aqui só registramos o índice (a RLS confere a permissão).
// ---------------------------------------------------------------------------
const esquemaArquivo = z.object({
  bucket: z.enum(["fotos-veiculos", "documentos"]),
  path: z.string().min(3).max(300),
  nome: z.string().min(1).max(200),
  mime: z.string().max(100).nullable().optional(),
  tamanho: z.number().int().nonnegative().nullable().optional(),
  entidade: z.enum(["veiculo", "consignacao"]),
  entidade_id: z.uuid(),
  categoria: z.enum(["foto", "crlv", "laudo", "contrato", "documento", "comprovante", "outro"]),
  sigiloso: z.boolean().default(false),
});

export async function registrarArquivos(arquivos: z.input<typeof esquemaArquivo>[], veiculoId: string): Promise<EstadoAcao<{ ids: string[] }>> {
  await exigirPermissao("estoque.gerenciar");
  const lista = z.array(esquemaArquivo).max(30).safeParse(arquivos);
  if (!lista.success) return { ok: false, erro: "Arquivos inválidos." };
  const supabase = await criarClienteServidor();
  const { count } = await supabase
    .from("arquivos")
    .select("id", { count: "exact", head: true })
    .eq("entidade", "veiculo")
    .eq("entidade_id", veiculoId)
    .eq("categoria", "foto");
  const base = count ?? 0;
  const registros = lista.data.map((a, i) => ({
    ...a,
    ordem: a.categoria === "foto" ? base + i : 0,
    capa: a.categoria === "foto" && base === 0 && i === 0,
  }));
  const { data, error } = await supabase.from("arquivos").insert(registros).select("id");
  if (error) {
    await supabase.storage.from(lista.data[0].bucket).remove(lista.data.map((a) => a.path));
    return { ok: false, erro: mensagemDeErro(error) };
  }
  // Contrato de consignação: vincula na consignação vigente
  const contrato = lista.data.find((a) => a.categoria === "contrato" && a.entidade === "consignacao");
  if (contrato && data) {
    const idx = lista.data.indexOf(contrato);
    await supabase.from("consignacoes").update({ contrato_arquivo_id: data[idx].id }).eq("id", contrato.entidade_id);
  }
  revalidarVeiculo(veiculoId);
  return { ok: true, dados: { ids: (data ?? []).map((d) => d.id) } };
}

export async function acaoFoto(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("estoque.gerenciar");
  const id = String(fd.get("id"));
  const veiculoId = String(fd.get("veiculo_id"));
  const acao = String(fd.get("acao"));
  const supabase = await criarClienteServidor();
  const { data: fotos } = await supabase
    .from("arquivos")
    .select("id, ordem, capa, bucket, path")
    .eq("entidade", "veiculo")
    .eq("entidade_id", veiculoId)
    .eq("categoria", "foto")
    .order("ordem");
  const lista = fotos ?? [];
  const i = lista.findIndex((f) => f.id === id);
  if (i < 0) return { ok: false, erro: "Foto não encontrada." };

  if (acao === "capa") {
    await supabase.from("arquivos").update({ capa: false }).eq("entidade", "veiculo").eq("entidade_id", veiculoId).eq("categoria", "foto");
    await supabase.from("arquivos").update({ capa: true }).eq("id", id);
  } else if (acao === "esquerda" || acao === "direita") {
    const j = acao === "esquerda" ? i - 1 : i + 1;
    if (j >= 0 && j < lista.length) {
      const nova = [...lista];
      [nova[i], nova[j]] = [nova[j], nova[i]];
      await Promise.all(nova.map((f, k) => supabase.from("arquivos").update({ ordem: k }).eq("id", f.id)));
    }
  } else if (acao === "remover") {
    const foto = lista[i];
    const { error } = await supabase.from("arquivos").delete().eq("id", id);
    if (error) return { ok: false, erro: mensagemDeErro(error) };
    await supabase.storage.from(foto.bucket).remove([foto.path]);
    if (foto.capa && lista.length > 1) {
      const proxima = lista.find((f) => f.id !== id)!;
      await supabase.from("arquivos").update({ capa: true }).eq("id", proxima.id);
    }
  }
  revalidarVeiculo(veiculoId);
  return { ok: true };
}

export async function removerDocumento(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("estoque.gerenciar");
  const id = String(fd.get("id"));
  const veiculoId = String(fd.get("veiculo_id"));
  const supabase = await criarClienteServidor();
  const { data: arq } = await supabase.from("arquivos").select("bucket, path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("arquivos").delete().eq("id", id);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  if (arq) await supabase.storage.from(arq.bucket).remove([arq.path]);
  revalidarVeiculo(veiculoId);
  return { ok: true, mensagem: "Documento removido." };
}

export async function alternarSigiloDocumento(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("estoque.gerenciar");
  const id = String(fd.get("id"));
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("arquivos").update({ sigiloso: fd.get("sigiloso") === "true" }).eq("id", id);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidarVeiculo(String(fd.get("veiculo_id")));
  return { ok: true };
}
