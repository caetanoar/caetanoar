"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { errosDoZod, mensagemDeErro, type EstadoAcao } from "@/lib/acoes";
import { parseMoeda } from "@/lib/format/moeda";

const TIPOS = ["funilaria", "mecanica", "pintura", "documentacao", "lavagem", "estetica", "pneus", "eletrica", "laudo", "transporte", "outros"] as const;

const esquemaCusto = z.object({
  veiculo_id: z.uuid(),
  tipo: z.enum(TIPOS, { message: "Escolha o tipo." }),
  valor: z.string().transform((v) => parseMoeda(v)).pipe(z.number({ message: "Informe o valor." }).positive("Informe um valor maior que zero.").max(1_000_000)),
  descricao: z.string().trim().max(300).optional(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
});

/** Preparador (ou gestão) lança um custo do carro em preparação; vira conta a pagar pendente. */
export async function lancarCusto(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("preparacao");
  const d = esquemaCusto.safeParse(Object.fromEntries(fd));
  if (!d.success) return { ok: false, erros: errosDoZod(d.error), erro: "Confira os campos." };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("lancar_custo_preparador", {
    p_veiculo: d.data.veiculo_id, p_tipo: d.data.tipo, p_valor: d.data.valor,
    p_descricao: d.data.descricao || undefined, p_data: d.data.data || undefined,
  });
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath(`/preparacao/${d.data.veiculo_id}`);
  return { ok: true, mensagem: "Custo lançado." };
}

const esquemaFoto = z.object({
  path: z.string().min(3).max(300),
  nome: z.string().min(1).max(200),
  mime: z.string().max(100).nullable().optional(),
  tamanho: z.number().int().nonnegative().nullable().optional(),
});

/** Fotos tiradas pelo preparador (só carro em preparação; a RLS confere). */
export async function registrarFotosPreparacao(fotos: z.input<typeof esquemaFoto>[], veiculoId: string): Promise<EstadoAcao> {
  await exigirPermissao("preparacao");
  const lista = z.array(esquemaFoto).min(1).max(20).safeParse(fotos);
  if (!lista.success || !z.uuid().safeParse(veiculoId).success) return { ok: false, erro: "Fotos inválidas." };
  const supabase = await criarClienteServidor();
  const { count } = await supabase.from("arquivos").select("id", { count: "exact", head: true })
    .eq("entidade", "veiculo").eq("entidade_id", veiculoId).eq("categoria", "foto");
  const base = count ?? 0;
  const { error } = await supabase.from("arquivos").insert(lista.data.map((f, i) => ({
    ...f, bucket: "fotos-veiculos", entidade: "veiculo" as const, entidade_id: veiculoId, categoria: "foto" as const,
    sigiloso: false, ordem: base + i, capa: base === 0 && i === 0,
  })));
  if (error) {
    await supabase.storage.from("fotos-veiculos").remove(lista.data.map((f) => f.path));
    return { ok: false, erro: mensagemDeErro(error) };
  }
  revalidatePath(`/preparacao/${veiculoId}`);
  revalidatePath(`/estoque/${veiculoId}`);
  return { ok: true, mensagem: lista.data.length === 1 ? "Foto enviada." : `${lista.data.length} fotos enviadas.` };
}
