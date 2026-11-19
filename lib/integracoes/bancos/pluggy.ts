import type { AgregadorBancario, ContaExterna } from "./agregador";
import type { TransacaoExtrato } from "@/lib/extrato/tipos";

const BASE = "https://api.pluggy.ai";

/**
 * Pluggy (Open Finance). Ativado com OPEN_FINANCE_PROVIDER=pluggy,
 * PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET. Estrutura conforme a documentação pública.
 */
export function criarPluggy(clientId: string | undefined, clientSecret: string | undefined): AgregadorBancario {
  let apiKey: { valor: string; expira: number } | null = null;

  async function chave(): Promise<string> {
    if (!clientId || !clientSecret) throw new Error("Pluggy não configurado (PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET).");
    if (apiKey && apiKey.expira > Date.now()) return apiKey.valor;
    const r = await fetch(`${BASE}/auth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, clientSecret }), cache: "no-store" });
    if (!r.ok) throw new Error(`Pluggy recusou as credenciais (HTTP ${r.status}).`);
    const j = (await r.json()) as { apiKey: string };
    apiKey = { valor: j.apiKey, expira: Date.now() + 100 * 60 * 1000 };
    return j.apiKey;
  }

  async function obter<T>(caminho: string, init?: RequestInit): Promise<T> {
    const r = await fetch(`${BASE}${caminho}`, { ...init, headers: { "X-API-KEY": await chave(), "Content-Type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
    if (!r.ok) throw new Error(`Pluggy: erro HTTP ${r.status} em ${caminho.split("?")[0]}.`);
    return (await r.json()) as T;
  }

  return {
    nome: "Pluggy",
    configurado: Boolean(clientId && clientSecret),
    async tokenConexao() {
      const j = await obter<{ accessToken: string }>("/connect_token", { method: "POST", body: "{}" });
      return j.accessToken;
    },
    async contas(itemId) {
      const j = await obter<{ results: { id: string; name: string; number?: string; balance?: number; type?: string }[] }>(`/accounts?itemId=${encodeURIComponent(itemId)}`);
      return j.results.map((c): ContaExterna => ({ id: c.id, nome: c.name, numero: c.number ?? null, saldo: c.balance ?? null, tipo: c.type ?? null }));
    },
    async transacoes(contaExternaId, de, ate) {
      const todas: TransacaoExtrato[] = [];
      for (let pagina = 1; pagina <= 20; pagina++) {
        const j = await obter<{ results: { id: string; date: string; description: string; amount: number; type?: string }[]; totalPages: number }>(
          `/transactions?accountId=${encodeURIComponent(contaExternaId)}&from=${de}&to=${ate}&pageSize=500&page=${pagina}`,
        );
        for (const t of j.results) {
          const valor = t.type === "DEBIT" ? -Math.abs(t.amount) : t.type === "CREDIT" ? Math.abs(t.amount) : t.amount;
          if (!valor) continue;
          todas.push({ data: t.date.slice(0, 10), valor: Math.round(valor * 100) / 100, descricao: t.description, documento: null, fitid: t.id });
        }
        if (pagina >= j.totalPages) break;
      }
      return todas;
    },
  };
}
