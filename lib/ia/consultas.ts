import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { ResultadoAnuncio, ResultadoCliente } from "./esquemas";

/** Última geração de anúncios do carro (ou null). */
export async function ultimoAnuncio(veiculoId: string): Promise<ResultadoAnuncio | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("ia_geracoes")
    .select("id, saida, avisos, simulado, criado_em")
    .eq("tipo", "anuncio")
    .eq("veiculo_id", veiculoId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const s = data.saida as Omit<ResultadoAnuncio, "id" | "avisos" | "simulado" | "criadoEm">;
  return { ...s, id: data.id, avisos: data.avisos, simulado: data.simulado, criadoEm: data.criado_em };
}

/** Último resumo do cliente (ou null). A RLS esconde de quem não pode ver o cliente. */
export async function ultimoResumoCliente(clienteId: string): Promise<ResultadoCliente | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase
    .from("ia_geracoes")
    .select("id, saida, avisos, simulado, criado_em")
    .eq("tipo", "cliente")
    .eq("cliente_id", clienteId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const s = data.saida as Omit<ResultadoCliente, "id" | "avisos" | "simulado" | "criadoEm">;
  return { ...s, id: data.id, avisos: data.avisos, simulado: data.simulado, criadoEm: data.criado_em };
}
