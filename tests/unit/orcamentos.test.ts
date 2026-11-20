import { describe, expect, it } from "vitest";
import { parcelaPrice, simular, taxasValidas } from "@/lib/orcamentos/simulacao";
import { nivelGeral } from "@/lib/orcamentos/rotulos";

describe("simulação de financiamento (Price)", () => {
  it("calcula a parcela fixa", () => {
    // R$ 40.000 em 48x a 1,99% a.m. = R$ 1.301,42 (fórmula da tabela Price)
    expect(parcelaPrice(40000, 1.99, 48)).toBe(1301.42);
  });
  it("sem juros divide igual", () => {
    expect(parcelaPrice(12000, 0, 12)).toBe(1000);
  });
  it("total = parcela × prazo", () => {
    const s = simular(30000, { prazo: 36, taxa_mensal: 1.5 });
    expect(s.total).toBeCloseTo(s.parcela * 36, 1);
  });
  it("ignora taxas mal configuradas e ordena por prazo", () => {
    expect(taxasValidas([{ prazo: 48, taxa_mensal: 2 }, { prazo: "x" }, { prazo: 12, taxa_mensal: 1.5 }, { prazo: 500, taxa_mensal: 1 }])).toEqual([
      { prazo: 12, taxa_mensal: 1.5 },
      { prazo: 48, taxa_mensal: 2 },
    ]);
    expect(taxasValidas(null)).toEqual([]);
  });
});

describe("nível dos alertas", () => {
  it("vermelho > amarelo > pendente > verde", () => {
    expect(nivelGeral([])).toBe("verde");
    expect(nivelGeral([{ codigo: "sem_consulta", nivel: "pendente", origem: "consulta", descricao: "" }])).toBe("pendente");
    expect(nivelGeral([{ codigo: "sem_laudo", nivel: "amarelo", origem: "cadastro", descricao: "" }, { codigo: "x", nivel: "pendente", origem: "consulta", descricao: "" }])).toBe("amarelo");
    expect(nivelGeral([{ codigo: "roubo_furto", nivel: "vermelho", origem: "consulta", descricao: "" }])).toBe("vermelho");
  });
});
