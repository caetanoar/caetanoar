import type { NotaSaida, ProvedorFiscal, ResultadoFiscal } from "./tipos";

const METODO: Record<string, string> = {
  dinheiro: "Cash", pix: "InstantPayment", ted: "BankTransfer", boleto: "BankBill", cartao_credito: "CreditCard",
  cartao_debito: "DebitCard", cheque: "Check", financiamento: "Others", troca: "Others",
};

function mapearStatus(s: string | undefined): ResultadoFiscal["status"] {
  const v = (s ?? "").toLowerCase();
  if (v === "issued" || v === "authorized") return "autorizada";
  if (v === "cancelled") return "cancelada";
  if (v === "processing" || v === "waitingsend" || v === "created") return "processando";
  if (v === "error" || v === "denied" || v === "rejected") return "rejeitada";
  return "erro";
}

/**
 * NFE.io (notas de produto). Ativado com FISCAL_PROVIDER=nfeio, FISCAL_API_TOKEN e FISCAL_EMPRESA_ID.
 * Estrutura conforme a documentação pública; validar em homologação antes de produção.
 */
export function criarProvedorNFeIo(token: string | undefined, empresaId: string | undefined): ProvedorFiscal {
  const base = `https://api.nfse.io/v2/companies/${empresaId ?? ""}/productinvoices`;

  async function chamar(metodo: string, caminho: string, corpo?: unknown) {
    if (!token || !empresaId) throw new Error("NFE.io não configurado (FISCAL_API_TOKEN e FISCAL_EMPRESA_ID).");
    const resp = await fetch(`${base}${caminho}`, {
      method: metodo,
      headers: { Authorization: token, "Content-Type": "application/json" },
      body: corpo ? JSON.stringify(corpo) : undefined,
      cache: "no-store",
    });
    const json = await resp.json().catch(() => ({}));
    return { ok: resp.ok, status: resp.status, json: json as Record<string, unknown> };
  }

  function resultado(json: Record<string, unknown>): ResultadoFiscal {
    const autorizacao = (json.authorization ?? {}) as Record<string, unknown>;
    return {
      status: mapearStatus(json.status as string),
      chave: (autorizacao.accessKey as string) ?? null,
      numero: json.number ? String(json.number) : null,
      serie: json.serie ? String(json.serie) : null,
      protocolo: (autorizacao.protocol as string) ?? null,
      mensagem: (json.statusReason as string) ?? (json.message as string) ?? null,
      referenciaProvedor: (json.id as string) ?? null,
      bruto: json,
    };
  }

  return {
    nome: "NFE.io",
    configurado: Boolean(token && empresaId),
    async emitir(n: NotaSaida) {
      const d = n.destinatario;
      const corpo = {
        operationNature: n.naturezaOperacao,
        operationType: "Outgoing",
        destination: d.endereco.uf === n.emitente.endereco.uf ? "Internal_Operation" : "Interstate_Operation",
        purposeType: "Normal",
        consumerType: d.documento.replace(/\D/g, "").length === 11 ? "FinalConsumer" : "Normal",
        presenceType: "Presence",
        buyer: {
          name: d.nome,
          federalTaxNumber: Number(d.documento.replace(/\D/g, "")),
          email: d.email ?? undefined,
          address: {
            state: d.endereco.uf,
            city: { code: d.endereco.codigoMunicipio ?? undefined, name: d.endereco.municipio },
            district: d.endereco.bairro,
            street: d.endereco.logradouro,
            number: d.endereco.numero,
            additionalInformation: d.endereco.complemento ?? undefined,
            postalCode: d.endereco.cep,
            country: "BRA",
          },
        },
        items: n.itens.map((i) => ({
          code: i.codigo,
          description: i.descricao,
          ncm: i.ncm,
          cfop: Number(i.cfop),
          unit: "UN",
          quantity: i.quantidade,
          unitAmount: i.valorUnitario,
          totalAmount: i.valorTotal,
          tax: { icms: { origin: "0", csosn: i.csosnCst } },
        })),
        payment: [{ paymentDetail: n.pagamentos.map((p) => ({ method: METODO[p.forma] ?? "Others", amount: p.valor })) }],
        additionalInformation: { taxpayer: n.informacoesComplementares ?? undefined },
      };
      const r = await chamar("POST", "", corpo);
      if (!r.ok) return { status: "erro", mensagem: (r.json.message as string) ?? `Erro HTTP ${r.status}`, bruto: r.json };
      return resultado(r.json);
    },
    async consultar(ref) {
      return resultado((await chamar("GET", `/${encodeURIComponent(ref)}`)).json);
    },
    async cancelar(ref) {
      return resultado((await chamar("DELETE", `/${encodeURIComponent(ref)}`)).json);
    },
  };
}
