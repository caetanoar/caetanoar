import "server-only";
import type { ProvedorConsultaVeicular } from "./tipos";
import { criarProvedorSimulado } from "./mock";

/**
 * Provedor escolhido por CONSULTA_VEICULAR_PROVIDER (padrão: mock).
 * O adapter de um provedor real só entra depois da escolha e da leitura da
 * documentação do contrato (chaves sempre em variáveis de ambiente).
 */
export function provedorConsulta(): ProvedorConsultaVeicular {
  const nome = (process.env.CONSULTA_VEICULAR_PROVIDER || "mock").toLowerCase();
  if (nome === "mock") return criarProvedorSimulado();
  return {
    nome,
    simulado: false,
    configurado: false,
    consultar: () => Promise.reject(new Error(`Provedor "${nome}" ainda não implementado. Use CONSULTA_VEICULAR_PROVIDER=mock.`)),
  };
}

export * from "./tipos";
