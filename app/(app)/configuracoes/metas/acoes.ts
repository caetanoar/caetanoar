"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { mensagemDeErro, type EstadoAcao } from "@/lib/acoes";
import { parseMoeda } from "@/lib/format/moeda";

export async function salvarMetas(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("metas.definir");
  const mes = String(fd.get("mes"));
  if (!/^\d{4}-\d{2}-01$/.test(mes)) return { ok: false, erro: "Mês inválido." };
  const linhas = z.array(z.string()).parse(JSON.parse(String(fd.get("linhas") ?? "[]")));
  const supabase = await criarClienteServidor();
  for (const chave of linhas) {
    const vendedorId = chave === "loja" ? null : chave;
    const fat = parseMoeda(String(fd.get(`fat_${chave}`) ?? ""));
    const lucro = parseMoeda(String(fd.get(`lucro_${chave}`) ?? ""));
    const qtdTxt = String(fd.get(`qtd_${chave}`) ?? "").replace(/\D/g, "");
    const qtd = qtdTxt ? Number(qtdTxt) : null;
    let q = supabase.from("metas").select("id").eq("mes", mes);
    q = vendedorId ? q.eq("vendedor_id", vendedorId) : q.is("vendedor_id", null);
    const { data: existente } = await q.maybeSingle();
    if (fat === null && lucro === null && qtd === null) {
      if (existente) await supabase.from("metas").delete().eq("id", existente.id);
      continue;
    }
    const registro = { mes, vendedor_id: vendedorId, meta_faturamento: fat, meta_lucro: lucro, meta_qtd_vendas: qtd };
    const { error } = existente
      ? await supabase.from("metas").update(registro).eq("id", existente.id)
      : await supabase.from("metas").insert(registro);
    if (error) return { ok: false, erro: mensagemDeErro(error) };
  }
  revalidatePath("/configuracoes/metas");
  revalidatePath("/dashboard");
  revalidatePath("/painel");
  return { ok: true, mensagem: "Metas salvas." };
}
