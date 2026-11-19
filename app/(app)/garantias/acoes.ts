"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { errosDoZod, mensagemDeErro, type EstadoAcao } from "@/lib/acoes";
import { dinheiroOpc, dataOpc, uuidOpc, textoOpc } from "@/lib/estoque/esquemas";

const esquemaAcionamento = z.object({
  id: uuidOpc,
  garantia_id: z.uuid(),
  data_abertura: dataOpc,
  descricao: z.string().trim().min(3, "Descreva o problema relatado."),
  custo: dinheiroOpc.transform((v) => v ?? 0),
  solucao: textoOpc,
  status: z.enum(["aberto", "em_andamento", "resolvido", "negado"]),
  fornecedor_id: uuidOpc,
});

export async function salvarAcionamento(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("garantias");
  const dados = esquemaAcionamento.safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: "Confira os campos." };
  const { id, ...registro } = dados.data;
  const supabase = await criarClienteServidor();
  const r = { ...registro, data_abertura: registro.data_abertura ?? undefined };
  const { error } = id
    ? await supabase.from("garantias_acionamentos").update(r).eq("id", id)
    : await supabase.from("garantias_acionamentos").insert(r);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath("/garantias", "layout");
  revalidatePath("/financeiro", "layout");
  return { ok: true, mensagem: id ? "Acionamento atualizado." : "Acionamento registrado." };
}

export async function ajustarGarantia(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("garantias");
  const dados = z
    .object({ id: z.uuid(), dias: z.coerce.number().int().min(0).max(3650), cobertura: textoOpc, observacoes: textoOpc })
    .safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error), erro: "Confira os campos." };
  const { id, ...resto } = dados.data;
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("garantias").update(resto).eq("id", id);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath("/garantias", "layout");
  return { ok: true, mensagem: "Garantia atualizada." };
}
