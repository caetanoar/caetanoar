import { afterEach, describe, expect, it, vi } from "vitest";
import { criarParallelumV1 } from "@/lib/integracoes/fipe/parallelum";
import { normalizarMarca, normalizarCombustivel } from "@/lib/integracoes/fipe/normalizar";

afterEach(() => vi.unstubAllGlobals());

describe("FIPE", () => {
  it("normaliza marca e combustível", () => {
    expect(normalizarMarca("VW - VolksWagen")).toBe("Volkswagen");
    expect(normalizarMarca("GM - Chevrolet")).toBe("Chevrolet");
    expect(normalizarMarca("Hyundai")).toBe("Hyundai");
    expect(normalizarCombustivel("Gasolina")).toBe("gasolina");
    expect(normalizarCombustivel("Álcool")).toBe("etanol");
  });

  it("consulta valor na Parallelum v1", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            Valor: "R$ 125.432,00", Marca: "VW - VolksWagen", Modelo: "T-Cross 200 TSI 1.0 Flex 12V 5p Aut.",
            AnoModelo: 2026, Combustivel: "Gasolina", CodigoFipe: "005531-0", MesReferencia: "novembro de 2026 ",
          }),
          { status: 200 },
        ),
      ),
    );
    const v = await criarParallelumV1().valor("59", "9999", "2026-1");
    expect(v).toMatchObject({ valor: 125432, anoModelo: 2026, codigoFipe: "005531-0", mesReferencia: "novembro de 2026" });
  });

  it("explica limite de consultas", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 429 })));
    await expect(criarParallelumV1().marcas()).rejects.toThrow(/Limite/);
  });
});
