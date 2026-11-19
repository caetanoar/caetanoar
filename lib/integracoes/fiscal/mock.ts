import type { NotaSaida, ProvedorFiscal, ResultadoFiscal } from "./tipos";

/** Dígito verificador da chave de acesso (módulo 11). */
export function dvChave(base43: string): string {
  let peso = 2;
  let soma = 0;
  for (let i = base43.length - 1; i >= 0; i--) {
    soma += Number(base43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const r = soma % 11;
  return String(r < 2 ? 0 : 11 - r);
}

/**
 * Provedor SIMULADO: não envia nada à SEFAZ. Gera uma chave fictícia para
 * testar o fluxo. A nota fica marcada como "simulada — sem valor fiscal".
 */
export function criarProvedorSimulado(): ProvedorFiscal {
  const emitidas = new Map<string, ResultadoFiscal>();
  return {
    nome: "Simulado (sem valor fiscal)",
    configurado: true,
    async emitir(nota: NotaSaida) {
      const agora = new Date(nota.dataEmissao);
      const aamm = `${String(agora.getFullYear()).slice(2)}${String(agora.getMonth() + 1).padStart(2, "0")}`;
      const numero = String(Math.floor(Math.random() * 900000) + 100000);
      const base = `31${aamm}${(nota.emitente.cnpj || "0".repeat(14)).padStart(14, "0")}55001${numero.padStart(9, "0")}1${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
      const r: ResultadoFiscal = {
        status: "autorizada",
        chave: base + dvChave(base),
        numero,
        serie: "1",
        protocolo: `SIMULADO-${Date.now()}`,
        mensagem: "Nota SIMULADA para testes — sem valor fiscal.",
        referenciaProvedor: nota.referencia,
        simulada: true,
      };
      emitidas.set(nota.referencia, r);
      return r;
    },
    async consultar(referencia) {
      return emitidas.get(referencia) ?? { status: "autorizada", mensagem: "Nota simulada.", simulada: true };
    },
    async cancelar() {
      return { status: "cancelada", mensagem: "Cancelamento simulado.", simulada: true };
    },
  };
}
