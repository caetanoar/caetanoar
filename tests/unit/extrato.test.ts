import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { lerOFX, decodificarOFX } from "@/lib/extrato/ofx";
import { lerCSV, detectarLayout } from "@/lib/extrato/csv";

const pasta = path.join(import.meta.dirname, "../fixtures");

describe("extrato OFX", () => {
  it("lê transações, período e saldo de OFX SGML", () => {
    const e = lerOFX(readFileSync(path.join(pasta, "extrato.ofx"), "latin1"));
    expect(e.transacoes).toHaveLength(3);
    expect(e.transacoes[0]).toEqual({ data: "2026-11-10", valor: 20000, descricao: "PIX RECEBIDO - MARIA SILVA", documento: "000001", fitid: "202611100001" });
    expect(e.transacoes[1].valor).toBe(-350);
    expect(e.transacoes[2]).toMatchObject({ valor: -12.9, descricao: "TARIFA PACOTE SERVICOS · TARIFA", data: "2026-11-15" });
    expect(e).toMatchObject({ inicio: "2026-11-01", fim: "2026-11-18", saldoFinal: 19637.1, conta: "123456-7" });
  });
  it("decodifica Windows-1252 quando o cabeçalho pede", () => {
    const bytes = new Uint8Array([...new TextEncoder().encode("CHARSET:1252\n<OFX>"), 0xe7]); // ç
    expect(decodificarOFX(bytes.buffer)).toContain("ç");
  });
  it("recusa arquivo que não é OFX", () => {
    expect(() => lerOFX("data;valor")).toThrow(/OFX/);
  });
});

describe("extrato CSV", () => {
  it("detecta o layout e lê os valores em reais", () => {
    const conteudo = readFileSync(path.join(pasta, "extrato.csv"), "utf8");
    const det = detectarLayout(conteudo);
    expect(det?.layout).toMatchObject({ separador: ";", colunaData: "Data", colunaDescricao: "Histórico", colunaValor: "Valor" });
    const e = lerCSV(conteudo);
    expect(e.transacoes.map((t) => t.valor)).toEqual([20000, -350, -12.9]);
    expect(e.transacoes[0]).toMatchObject({ data: "2026-11-10", documento: "000001" });
    expect(e.inicio).toBe("2026-11-10");
  });
  it("aceita colunas separadas de débito e crédito", () => {
    const csv = "Data,Descrição,Débito,Crédito\n2026-11-01,Depósito,,1500.00\n2026-11-02,Boleto,200.50,\n";
    const e = lerCSV(csv);
    expect(e.transacoes.map((t) => t.valor)).toEqual([1500, -200.5]);
  });
});
