import { describe, expect, it, vi, afterEach } from "vitest";
import { criarProvedorSimulado, dvChave } from "@/lib/integracoes/fiscal/mock";
import { criarProvedorFocusNFe } from "@/lib/integracoes/fiscal/focusnfe";
import type { NotaSaida } from "@/lib/integracoes/fiscal/tipos";

afterEach(() => vi.unstubAllGlobals());

const endereco = { logradouro: "Rua Goiás", numero: "100", bairro: "Centro", municipio: "Divinópolis", codigoMunicipio: "3122306", uf: "MG", cep: "35500000" };
const nota: NotaSaida = {
  referencia: "teste-1",
  ambiente: "homologacao",
  dataEmissao: "2026-11-19T10:00:00-03:00",
  naturezaOperacao: "Venda de veículo usado",
  emitente: { cnpj: "11222333000181", inscricaoEstadual: "123", razaoSocial: "Caetano Auto", regime: "simples_nacional", endereco },
  destinatario: { nome: "Maria", documento: "52998224725", endereco },
  itens: [{ numero: 1, codigo: "CARRO1", descricao: "VW T-Cross", ncm: "87032100", cfop: "5102", quantidade: 1, valorUnitario: 100000, valorTotal: 100000, csosnCst: "500" }],
  pagamentos: [{ forma: "pix", valor: 100000 }],
  valorTotal: 100000,
};

describe("emissão fiscal", () => {
  it("dígito verificador da chave confere com uma chave real", () => {
    const chave = "31261116670085000155550010000123451000123456";
    expect(dvChave(chave.slice(0, 43))).toBe(chave[43]);
  });

  it("provedor simulado gera chave válida e marca como simulada", async () => {
    const r = await criarProvedorSimulado().emitir(nota);
    expect(r.status).toBe("autorizada");
    expect(r.simulada).toBe(true);
    expect(r.chave).toMatch(/^\d{44}$/);
    expect(dvChave(r.chave!.slice(0, 43))).toBe(r.chave![43]);
  });

  it("Focus NFe monta o pedido com autenticação e mapeia o status", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: "processando_autorizacao" }), { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await criarProvedorFocusNFe("token-de-teste", "homologacao").emitir(nota);
    expect(r.status).toBe("processando");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://homologacao.focusnfe.com.br/v2/nfe?ref=teste-1");
    expect((init.headers as Record<string, string>).Authorization).toMatch(/^Basic /);
    const corpo = JSON.parse(String(init.body));
    expect(corpo).toMatchObject({ cnpj_emitente: "11222333000181", cpf_destinatario: "52998224725", consumidor_final: 1 });
    expect(corpo.formas_pagamento[0]).toEqual({ forma_pagamento: "17", valor_pagamento: 100000 });
  });

  it("Focus NFe sem token avisa que não está configurado", async () => {
    await expect(criarProvedorFocusNFe(undefined, "homologacao").emitir(nota)).rejects.toThrow(/não configurado/);
  });
});
