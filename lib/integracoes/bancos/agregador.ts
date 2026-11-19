import type { TransacaoExtrato } from "@/lib/extrato/tipos";

export type ContaExterna = { id: string; nome: string; numero: string | null; saldo: number | null; tipo: string | null };

/** Contrato de um agregador de Open Finance (Pluggy, Belvo, …). */
export interface AgregadorBancario {
  nome: string;
  configurado: boolean;
  /** Token curto para abrir o widget de conexão do banco no navegador. */
  tokenConexao(): Promise<string>;
  contas(itemId: string): Promise<ContaExterna[]>;
  transacoes(contaExternaId: string, de: string, ate: string): Promise<TransacaoExtrato[]>;
}

export function agregadorDesligado(): AgregadorBancario {
  const erro = () => Promise.reject(new Error("Open Finance não configurado (OPEN_FINANCE_PROVIDER=none)."));
  return { nome: "Nenhum", configurado: false, tokenConexao: erro, contas: erro, transacoes: erro };
}
