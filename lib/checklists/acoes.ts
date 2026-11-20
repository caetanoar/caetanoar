"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { errosDoZod, mensagemDeErro, type EstadoAcao } from "@/lib/acoes";

const CAMINHO = "/configuracoes/checklists";

const esquemaItem = z.object({
  id: z.uuid().optional().or(z.literal("")),
  tipo: z.enum(["preparacao", "documentacao"]),
  item: z.string().trim().min(2, "Escreva o item (pelo menos 2 letras).").max(80, "Use até 80 caracteres."),
  prazo_dias: z.string().trim().optional().transform((v) => (v ? Number(v) : null)).pipe(z.number().int("Use dias inteiros.").min(0).max(365).nullable()),
});

/** Cria ou altera um item do modelo (só o dono; a RLS confere). */
export async function salvarItemModelo(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("configuracoes");
  const d = esquemaItem.safeParse(Object.fromEntries(fd));
  if (!d.success) return { ok: false, erros: errosDoZod(d.error), erro: "Confira o item." };
  const supabase = await criarClienteServidor();
  const { id, ...dados } = d.data;
  let erro;
  if (id) {
    ({ error: erro } = await supabase.from("checklist_modelos").update({ item: dados.item, prazo_dias: dados.prazo_dias }).eq("id", id));
  } else {
    const { data: ultimo } = await supabase.from("checklist_modelos").select("ordem").eq("tipo", dados.tipo).order("ordem", { ascending: false }).limit(1).maybeSingle();
    ({ error: erro } = await supabase.from("checklist_modelos").insert({ ...dados, ordem: (ultimo?.ordem ?? 0) + 10 }));
  }
  if (erro) return { ok: false, erro: (erro as { code?: string }).code === "23505" ? "Já existe um item com esse nome neste checklist." : mensagemDeErro(erro) };
  revalidatePath(CAMINHO);
  return { ok: true, mensagem: id ? "Item alterado." : "Item adicionado." };
}

const esquemaAcao = z.object({ id: z.uuid(), acao: z.enum(["subir", "descer", "ativar", "desativar", "excluir"]) });

/** Reordena, ativa/desativa ou exclui um item do modelo. */
export async function acaoItemModelo(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("configuracoes");
  const d = esquemaAcao.safeParse(Object.fromEntries(fd));
  if (!d.success) return { ok: false, erro: "Ação inválida." };
  const supabase = await criarClienteServidor();
  const { data: item } = await supabase.from("checklist_modelos").select("id, tipo, ordem").eq("id", d.data.id).maybeSingle();
  if (!item) return { ok: false, erro: "Item não encontrado." };
  let erro = null;
  if (d.data.acao === "subir" || d.data.acao === "descer") {
    const { data: lista } = await supabase.from("checklist_modelos").select("id, ordem").eq("tipo", item.tipo).order("ordem").order("item");
    const itens = lista ?? [];
    const i = itens.findIndex((x) => x.id === item.id);
    const j = d.data.acao === "subir" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= itens.length) return { ok: true };
    [itens[i], itens[j]] = [itens[j], itens[i]];
    // Regrava a ordem de todos (10, 20, 30...) para não depender de empates.
    for (const [k, x] of itens.entries()) {
      const { error } = await supabase.from("checklist_modelos").update({ ordem: (k + 1) * 10 }).eq("id", x.id);
      if (error) { erro = error; break; }
    }
  } else if (d.data.acao === "excluir") {
    ({ error: erro } = await supabase.from("checklist_modelos").delete().eq("id", item.id));
  } else {
    ({ error: erro } = await supabase.from("checklist_modelos").update({ ativo: d.data.acao === "ativar" }).eq("id", item.id));
  }
  if (erro) return { ok: false, erro: mensagemDeErro(erro) };
  revalidatePath(CAMINHO);
  return { ok: true, mensagem: { subir: undefined, descer: undefined, ativar: "Item ativado.", desativar: "Item desativado.", excluir: "Item excluído." }[d.data.acao] };
}
