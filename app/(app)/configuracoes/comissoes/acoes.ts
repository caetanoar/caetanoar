"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { errosDoZod, mensagemDeErro, type EstadoAcao } from "@/lib/acoes";
import { dinheiroOpc, uuidOpc, dataOpc, textoOpc } from "@/lib/estoque/esquemas";

const percentualOpc = z
  .preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.union([z.string(), z.number()]).nullable().optional())
  .transform((v, ctx) => {
    if (v === null || v === undefined) return null;
    const n = Number(String(v).replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      ctx.addIssue({ code: "custom", message: "Percentual entre 0 e 100." });
      return z.NEVER;
    }
    return n;
  });

const esquemaRegra = z
  .object({
    nome: z.string().trim().min(2, "Dê um nome à regra."),
    tipo: z.enum(["loja_consignado", "vendedor", "parceiro"]),
    consignante_id: uuidOpc,
    vendedor_id: uuidOpc,
    parceiro_id: uuidOpc,
    aplica_a: z.enum(["proprio", "consignado", "todos"]),
    modo: z.enum(["percentual", "fixo"]),
    base: z.enum(["valor_venda", "comissao_loja", "lucro"]),
    percentual: percentualOpc,
    valor_fixo: dinheiroOpc,
    piso: dinheiroOpc,
    teto: dinheiroOpc,
    vigente_desde: dataOpc,
    vigente_ate: dataOpc,
    prioridade: z.coerce.number().int().default(0),
    ativa: z.preprocess((v) => v !== "false", z.boolean()),
    observacoes: textoOpc,
  })
  .superRefine((r, ctx) => {
    if (r.modo === "percentual" && r.percentual === null) ctx.addIssue({ code: "custom", path: ["percentual"], message: "Informe o percentual." });
    if (r.modo === "fixo" && r.valor_fixo === null) ctx.addIssue({ code: "custom", path: ["valor_fixo"], message: "Informe o valor fixo." });
    if (r.piso !== null && r.teto !== null && r.piso > r.teto) ctx.addIssue({ code: "custom", path: ["teto"], message: "O teto deve ser maior que o piso." });
  })
  .transform((r) => ({
    ...r,
    consignante_id: r.tipo === "loja_consignado" ? r.consignante_id : null,
    vendedor_id: r.tipo === "vendedor" ? r.vendedor_id : null,
    parceiro_id: r.tipo === "parceiro" ? r.parceiro_id : null,
    base: r.tipo === "loja_consignado" ? ("valor_venda" as const) : r.base,
    aplica_a: r.tipo === "loja_consignado" ? ("consignado" as const) : r.aplica_a,
    percentual: r.modo === "percentual" ? r.percentual : null,
    valor_fixo: r.modo === "fixo" ? r.valor_fixo : null,
  }));

export async function salvarRegra(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("comissoes.regras");
  const id = String(fd.get("id") ?? "") || null;
  const dados = esquemaRegra.safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: "Confira os campos." };
  const registro = { ...dados.data, vigente_desde: dados.data.vigente_desde ?? undefined };
  const supabase = await criarClienteServidor();
  const { error } = id
    ? await supabase.from("regras_comissao").update(registro).eq("id", id)
    : await supabase.from("regras_comissao").insert(registro);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath("/configuracoes/comissoes");
  return { ok: true, mensagem: "Regra salva." };
}

export async function excluirRegra(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("comissoes.regras");
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("regras_comissao").delete().eq("id", String(fd.get("id")));
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath("/configuracoes/comissoes");
  return { ok: true, mensagem: "Regra excluída. As comissões já calculadas guardam a regra usada." };
}

export async function definirRegraConsignacao(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("comissoes.regras");
  const consignacao = String(fd.get("consignacao_id"));
  const regra = String(fd.get("regra_id") ?? "") || null;
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("consignacoes").update({ regra_comissao_id: regra }).eq("id", consignacao);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath("/configuracoes/comissoes");
  revalidatePath("/estoque", "layout");
  return { ok: true, mensagem: "Regra da consignação atualizada." };
}
