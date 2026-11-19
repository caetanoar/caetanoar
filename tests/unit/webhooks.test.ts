import { describe, expect, it } from "vitest";
import { assinar, verificarAssinatura } from "@/lib/webhooks/assinatura";
import { documentoOpenApi } from "@/lib/api/openapi";

describe("assinatura dos webhooks", () => {
  const corpo = JSON.stringify({ id: 1, tipo: "venda.fechada", dados: { valor: 70000 } });

  it("gera t=<unix>,v1=<hex> e o receptor confere", () => {
    const h = assinar("whsec_x", 1_800_000_000, corpo);
    expect(h).toMatch(/^t=1800000000,v1=[0-9a-f]{64}$/);
    expect(verificarAssinatura("whsec_x", h, corpo, 1_800_000_100)).toBe(true);
  });

  it("recusa corpo alterado, segredo errado e assinatura velha (reenvio)", () => {
    const h = assinar("whsec_x", 1_800_000_000, corpo);
    expect(verificarAssinatura("whsec_x", h, corpo.replace("70000", "1"), 1_800_000_000)).toBe(false);
    expect(verificarAssinatura("whsec_y", h, corpo, 1_800_000_000)).toBe(false);
    expect(verificarAssinatura("whsec_x", h, corpo, 1_800_000_000 + 301)).toBe(false);
    expect(verificarAssinatura("whsec_x", "lixo", corpo)).toBe(false);
  });
});

describe("OpenAPI", () => {
  it("documenta os quatro endpoints e não expõe campos sigilosos", () => {
    const doc = documentoOpenApi("https://crm.exemplo.com");
    expect(doc.servers[0].url).toBe("https://crm.exemplo.com/api/v1");
    expect(Object.keys(doc.paths)).toEqual(["/veiculos", "/veiculos/{id}", "/leads", "/vendas"]);
    const texto = JSON.stringify(doc.components.schemas);
    for (const sigiloso of ["preco_minimo", "valor_compra", "preco_negociavel", "placa", "chassi", "lucro", "cpf"]) expect(texto).not.toContain(sigiloso);
  });
});
