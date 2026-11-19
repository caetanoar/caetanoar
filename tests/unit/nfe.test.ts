import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { lerNFe, marcaModeloDaDescricao } from "@/lib/nfe/xml-parser";

const xml = readFileSync(path.join(import.meta.dirname, "../fixtures/nfe-entrada-veiculo.xml"), "utf8");

describe("leitura de XML de NF-e", () => {
  it("extrai cabeçalho, emitente, destinatário e totais", () => {
    const n = lerNFe(xml);
    expect(n.chave).toBe("31261116670085000155550010000123451000123456");
    expect(n.numero).toBe("12345");
    expect(n.serie).toBe("1");
    expect(n.emitente).toMatchObject({ documento: "16670085000155", nome: "LOCALIZA RENT A CAR SA" });
    expect(n.destinatario.documento).toBe("11222333000181");
    expect(n.valorTotal).toBe(72500);
    expect(n.autorizada).toBe(true);
    expect(n.protocolo).toBe("131260000123456");
  });

  it("extrai os dados do veículo (veicProd)", () => {
    const item = lerNFe(xml).itens[0];
    expect(item.cfop).toBe("5551");
    expect(item.ncm).toBe("87032100");
    expect(item.veiculo).toMatchObject({
      chassi: "9BGEB69H0RG123456", cor: "PRATA", anoModelo: 2024, anoFabricacao: 2023, combustivel: "flex", renavam: "01234567890", placa: "RQH2B45",
    });
  });

  it("separa marca e modelo da descrição", () => {
    expect(marcaModeloDaDescricao("CHEVROLET ONIX 1.0 TURBO LT AT 2023/2024 PRATA PLACA RQH2B45")).toEqual({ marca: "Chevrolet", modelo: "Onix", versao: "1.0 TURBO LT AT" });
    expect(marcaModeloDaDescricao("VW T-CROSS 200 TSI")).toMatchObject({ marca: "Volkswagen", modelo: "T-Cross" });
  });

  it("recusa XML que não é NF-e", () => {
    expect(() => lerNFe("<nada/>")).toThrow(/NF-e/);
    expect(() => lerNFe("isto não é xml <")).toThrow();
  });
});
