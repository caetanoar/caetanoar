import { describe, expect, it } from "vitest";
import { atalhosPeriodo, formatarCelula, lerPeriodo, montarCSV, nomeArquivo, valorCSV } from "@/lib/relatorios/formato";

describe("CSV de relatórios", () => {
  const colunas = [
    { chave: "nome", rotulo: "Cliente", tipo: "texto" as const },
    { chave: "data", rotulo: "Data", tipo: "data" as const },
    { chave: "valor", rotulo: "Valor", tipo: "moeda" as const },
  ];

  it("começa com BOM, separa por ponto e vírgula e usa vírgula decimal", () => {
    const csv = montarCSV(colunas, [{ nome: "João", data: "2026-11-19", valor: 129999.9 }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const linhas = csv.slice(1).split("\r\n");
    expect(linhas[0]).toBe("Cliente;Data;Valor");
    expect(linhas[1]).toBe("João;19/11/2026;129999,90");
  });

  it("escapa aspas, ponto e vírgula e quebra de linha", () => {
    const csv = montarCSV(colunas, [{ nome: 'Carro "top"; revisado\nok', data: null, valor: null }]);
    expect(csv.split("\r\n")[1]).toBe('"Carro ""top""; revisado\nok";;');
  });

  it("neutraliza fórmulas em campos de texto, mas não em números negativos", () => {
    expect(valorCSV("texto", "=HYPERLINK(\"x\")")).toBe("'=HYPERLINK(\"x\")");
    expect(valorCSV("texto", "-1+1")).toBe("'-1+1");
    expect(valorCSV("moeda", -250.5)).toBe("-250,50");
  });

  it("formata células para a tela", () => {
    expect(formatarCelula("moeda", 42000)).toBe("R$ 42.000,00");
    expect(formatarCelula("data", "2026-01-05")).toBe("05/01/2026");
    expect(formatarCelula("percentual", 12.5)).toBe("12,5%");
    expect(formatarCelula("numero", 1234)).toBe("1.234");
    expect(formatarCelula("texto", null)).toBe("—");
  });
});

describe("período dos relatórios", () => {
  it("usa do início do mês até hoje por padrão", () => {
    expect(lerPeriodo({}, "2026-11-19")).toEqual({ de: "2026-11-01", ate: "2026-11-19" });
  });

  it("ignora datas inválidas e inverte intervalos trocados", () => {
    expect(lerPeriodo({ de: "19/11/2026", ate: "2026-11-10" }, "2026-11-19")).toEqual({ de: "2026-11-01", ate: "2026-11-10" });
    expect(lerPeriodo({ de: "2026-11-15", ate: "2026-10-01" }, "2026-11-19")).toEqual({ de: "2026-10-01", ate: "2026-11-15" });
  });

  it("calcula os atalhos e o nome do arquivo", () => {
    const a = atalhosPeriodo("2026-03-10");
    expect(a.find((x) => x.rotulo === "Mês passado")).toMatchObject({ de: "2026-02-01", ate: "2026-02-28" });
    expect(a.find((x) => x.rotulo === "Este ano")).toMatchObject({ de: "2026-01-01", ate: "2026-03-10" });
    expect(nomeArquivo("vendas", { de: "2026-11-01", ate: "2026-11-19" }, "csv")).toBe("relatorio-vendas-2026-11-01-a-2026-11-19.csv");
  });
});
