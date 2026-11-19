import "server-only";
import type { ProvedorFipe, FipeValor } from "./tipos";
import { criarParallelumV1, criarParallelumV2 } from "./parallelum";
import { precoPorCodigoBrasilAPI } from "./brasilapi";

export type { FipeOpcao, FipeValor } from "./tipos";

/** Provedor da consulta em cascata (marca → modelo → ano). Configurável por variável de ambiente. */
export function provedorFipe(): ProvedorFipe {
  const token = process.env.FIPE_TOKEN;
  return token ? criarParallelumV2(token) : criarParallelumV1();
}

/** Atualiza o valor de um carro já cadastrado pelo código FIPE (BrasilAPI, com reserva na Parallelum). */
export async function valorPorCodigo(codigoFipe: string, anoModelo: number, combustivel?: string | null): Promise<FipeValor | null> {
  const lista = await precoPorCodigoBrasilAPI(codigoFipe);
  const doAno = lista.filter((v) => v.anoModelo === anoModelo);
  if (doAno.length === 0) return null;
  if (combustivel) {
    const c = doAno.find((v) => v.combustivel.toLowerCase().includes(combustivel.toLowerCase()));
    if (c) return c;
  }
  return doAno[0];
}
