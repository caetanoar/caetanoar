import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { ChaveVerificacao, DadosVeiculoConsulta, Verificacao } from "@/lib/integracoes/consulta-veicular/tipos";

export type ConsultaSalva = {
  id: string;
  placa: string;
  provedor: string;
  simulado: boolean;
  status: "encontrado" | "nao_encontrado" | "erro";
  consultado_em: string;
  expira_em: string;
  custo: number;
  veiculo_id: string | null;
  dados: Partial<DadosVeiculoConsulta>;
  verificacoes: Partial<Record<ChaveVerificacao, Verificacao>>;
  selo: "verde" | "amarelo" | "vermelho" | null;
  erro: string | null;
  usuario: string | null;
};

const CAMPOS = "id, placa, provedor, simulado, status, consultado_em, expira_em, custo, veiculo_id, dados, verificacoes, selo, erro, usuarios(nome)";

function mapear(c: Record<string, unknown>): ConsultaSalva {
  return { ...(c as unknown as ConsultaSalva), custo: Number(c.custo ?? 0), usuario: (c.usuarios as { nome: string } | null)?.nome ?? null };
}

/** Consulta mais recente da placa (com resultado, ou seja, não erro). */
export async function ultimaConsulta(placa: string): Promise<ConsultaSalva | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("consultas_veiculares").select(CAMPOS).eq("placa", placa).neq("status", "erro")
    .order("consultado_em", { ascending: false }).limit(1).maybeSingle();
  return data ? mapear(data) : null;
}

export async function consultaPorId(id: string): Promise<ConsultaSalva | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("consultas_veiculares").select(CAMPOS).eq("id", id).maybeSingle();
  return data ? mapear(data) : null;
}

export async function historicoPlaca(placa: string, limite = 10): Promise<ConsultaSalva[]> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("consultas_veiculares").select(CAMPOS).eq("placa", placa).order("consultado_em", { ascending: false }).limit(limite);
  return (data ?? []).map(mapear);
}

export async function consultasRecentes(limite = 20, usuarioId?: string): Promise<ConsultaSalva[]> {
  const supabase = await criarClienteServidor();
  let q = supabase.from("consultas_veiculares").select(CAMPOS).order("consultado_em", { ascending: false }).limit(limite);
  if (usuarioId) q = q.eq("usuario_id", usuarioId);
  const { data } = await q;
  return (data ?? []).map(mapear);
}

/** Carro da loja com essa placa (o que ainda está no estoque vem primeiro). */
export async function carroDaPlaca(placa: string) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("v_veiculos")
    .select("id, tipo, status, marca, modelo, versao, ano_fabricacao, ano_modelo, cor, km, preco_anunciado, laudo_cautelar, laudo_resultado, foto_capa, chassi")
    .eq("placa", placa)
    .order("data_entrada", { ascending: false });
  const lista = data ?? [];
  return lista.find((v) => v.status !== "vendido" && v.status !== "devolvido") ?? lista[0] ?? null;
}

export async function usoMes() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("uso_consultas_mes").maybeSingle();
  return data ?? { qtd: 0, valor: 0, limite_qtd: null, limite_valor: null, custo_unitario: 0 };
}
