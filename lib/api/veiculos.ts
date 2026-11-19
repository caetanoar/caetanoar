import "server-only";
import { criarClienteAdmin } from "@/lib/supabase/admin";

/** Campos públicos do carro na API (nada de placa, chassi, custo, mínimo ou consignante). */
const CAMPOS = "id, marca, modelo, versao, motor, ano_fabricacao, ano_modelo, cor, km, combustivel, cambio, portas, preco_anunciado, status, data_entrada, laudo_cautelar, laudo_resultado, descricao";
export const STATUS_PUBLICOS = ["disponivel", "reservado"] as const;

type Linha = Record<string, unknown> & { id: string };

async function completar(linhas: Linha[]) {
  if (!linhas.length) return [];
  const admin = criarClienteAdmin();
  const ids = linhas.map((l) => l.id);
  const [{ data: fotos }, { data: itens }] = await Promise.all([
    admin.from("arquivos").select("entidade_id, path, capa, ordem").eq("entidade", "veiculo").eq("categoria", "foto").in("entidade_id", ids).order("capa", { ascending: false }).order("ordem"),
    admin.from("veiculo_itens").select("veiculo_id, item").eq("confirmado", true).in("veiculo_id", ids).order("ordem"),
  ]);
  const url = (path: string) => admin.storage.from("fotos-veiculos").getPublicUrl(path).data.publicUrl;
  return linhas.map((l) => ({
    ...l,
    laudo_cautelar: l.laudo_cautelar ? l.laudo_resultado : null,
    laudo_resultado: undefined,
    fotos: (fotos ?? []).filter((f) => f.entidade_id === l.id).map((f) => url(f.path)),
    itens_confirmados: (itens ?? []).filter((i) => i.veiculo_id === l.id).map((i) => i.item),
  }));
}

export async function listarVeiculosApi(opcoes: { status: string[]; limite: number; pagina: number }) {
  const admin = criarClienteAdmin();
  const de = (opcoes.pagina - 1) * opcoes.limite;
  const { data, count, error } = await admin
    .from("veiculos")
    .select(CAMPOS, { count: "exact" })
    .in("status", opcoes.status as (typeof STATUS_PUBLICOS)[number][])
    .order("data_entrada", { ascending: false })
    .range(de, de + opcoes.limite - 1);
  if (error) throw new Error(error.message);
  return { dados: await completar((data ?? []) as Linha[]), total: count ?? 0 };
}

export async function buscarVeiculoApi(id: string) {
  const admin = criarClienteAdmin();
  const { data } = await admin.from("veiculos").select(CAMPOS).eq("id", id).in("status", [...STATUS_PUBLICOS]).maybeSingle();
  if (!data) return null;
  return (await completar([data as Linha]))[0];
}
