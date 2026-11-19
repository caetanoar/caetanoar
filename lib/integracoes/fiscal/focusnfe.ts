import type { NotaSaida, ProvedorFiscal, ResultadoFiscal } from "./tipos";

/** Código tPag da NF-e. */
const FORMA_TPAG: Record<string, string> = {
  dinheiro: "01", cartao_credito: "03", cartao_debito: "04", boleto: "15", ted: "18", pix: "17", cheque: "02", financiamento: "99", troca: "99",
};

function mapearStatus(s: string | undefined): ResultadoFiscal["status"] {
  switch (s) {
    case "autorizado": return "autorizada";
    case "cancelado": return "cancelada";
    case "erro_autorizacao":
    case "denegado": return "rejeitada";
    case "processando_autorizacao": return "processando";
    default: return "erro";
  }
}

/**
 * Focus NFe (API v2). Ativado com FISCAL_PROVIDER=focusnfe e FISCAL_API_TOKEN.
 * Estrutura conforme a documentação pública; validar em homologação antes de produção.
 */
export function criarProvedorFocusNFe(token: string | undefined, ambiente: "homologacao" | "producao"): ProvedorFiscal {
  const base = ambiente === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
  const auth = token ? `Basic ${Buffer.from(`${token}:`).toString("base64")}` : "";

  async function chamar(metodo: string, caminho: string, corpo?: unknown) {
    if (!token) throw new Error("Focus NFe não configurado (FISCAL_API_TOKEN ausente).");
    const resp = await fetch(`${base}${caminho}`, {
      method: metodo,
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: corpo ? JSON.stringify(corpo) : undefined,
      cache: "no-store",
    });
    const json = await resp.json().catch(() => ({}));
    return { ok: resp.ok, status: resp.status, json: json as Record<string, unknown> };
  }

  function resultado(json: Record<string, unknown>, ref: string): ResultadoFiscal {
    return {
      status: mapearStatus(json.status as string),
      chave: (json.chave_nfe as string)?.replace(/^NFe/, "") ?? null,
      numero: (json.numero as string) ?? null,
      serie: (json.serie as string) ?? null,
      protocolo: (json.protocolo as string) ?? null,
      mensagem: (json.mensagem_sefaz as string) ?? (json.mensagem as string) ?? null,
      xmlUrl: json.caminho_xml_nota_fiscal ? `${base}${json.caminho_xml_nota_fiscal}` : null,
      pdfUrl: json.caminho_danfe ? `${base}${json.caminho_danfe}` : null,
      referenciaProvedor: ref,
      bruto: json,
    };
  }

  return {
    nome: "Focus NFe",
    configurado: Boolean(token),
    async emitir(n: NotaSaida) {
      const doc = n.destinatario.documento.replace(/\D/g, "");
      const corpo = {
        natureza_operacao: n.naturezaOperacao,
        data_emissao: n.dataEmissao,
        tipo_documento: 1,
        finalidade_emissao: 1,
        local_destino: n.destinatario.endereco.uf === n.emitente.endereco.uf ? 1 : 2,
        consumidor_final: doc.length === 11 ? 1 : 0,
        presenca_comprador: 1,
        cnpj_emitente: n.emitente.cnpj,
        nome_destinatario: n.destinatario.nome,
        ...(doc.length === 11 ? { cpf_destinatario: doc } : { cnpj_destinatario: doc }),
        indicador_inscricao_estadual_destinatario: 9,
        logradouro_destinatario: n.destinatario.endereco.logradouro,
        numero_destinatario: n.destinatario.endereco.numero,
        complemento_destinatario: n.destinatario.endereco.complemento ?? undefined,
        bairro_destinatario: n.destinatario.endereco.bairro,
        municipio_destinatario: n.destinatario.endereco.municipio,
        uf_destinatario: n.destinatario.endereco.uf,
        cep_destinatario: n.destinatario.endereco.cep,
        email_destinatario: n.destinatario.email ?? undefined,
        modalidade_frete: 9,
        informacoes_adicionais_contribuinte: n.informacoesComplementares ?? undefined,
        items: n.itens.map((i) => ({
          numero_item: i.numero,
          codigo_produto: i.codigo,
          descricao: i.descricao,
          cfop: i.cfop,
          codigo_ncm: i.ncm,
          unidade_comercial: "UN",
          quantidade_comercial: i.quantidade,
          valor_unitario_comercial: i.valorUnitario,
          unidade_tributavel: "UN",
          quantidade_tributavel: i.quantidade,
          valor_unitario_tributavel: i.valorUnitario,
          valor_bruto: i.valorTotal,
          icms_origem: 0,
          icms_situacao_tributaria: i.csosnCst,
          pis_situacao_tributaria: "49",
          cofins_situacao_tributaria: "49",
        })),
        formas_pagamento: n.pagamentos.map((p) => ({ forma_pagamento: FORMA_TPAG[p.forma] ?? "99", valor_pagamento: p.valor })),
      };
      const r = await chamar("POST", `/v2/nfe?ref=${encodeURIComponent(n.referencia)}`, corpo);
      if (!r.ok && r.status !== 202) {
        return { status: "erro", mensagem: (r.json.mensagem as string) ?? `Erro HTTP ${r.status}`, bruto: r.json, referenciaProvedor: n.referencia };
      }
      return resultado(r.json, n.referencia);
    },
    async consultar(ref) {
      const r = await chamar("GET", `/v2/nfe/${encodeURIComponent(ref)}`);
      return resultado(r.json, ref);
    },
    async cancelar(ref, justificativa) {
      const r = await chamar("DELETE", `/v2/nfe/${encodeURIComponent(ref)}`, { justificativa });
      return resultado(r.json, ref);
    },
  };
}
