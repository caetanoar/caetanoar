import { describe, expect, it } from "vitest";
import { formatarMoeda, parseMoeda, mascararMoedaDigitada } from "@/lib/format/moeda";
import { formatarData, parseDataBR, diasEntre, somarDias, fimDoMes, hojeISO } from "@/lib/format/data";
import { validarCPF, validarCNPJ, formatarDocumento, mascararCPF } from "@/lib/format/documentos";
import { validarPlaca, formatarPlaca, validarRenavam, validarChassi, formatarKm } from "@/lib/format/veiculo";
import { formatarTelefone, telefoneInternacional } from "@/lib/format/telefone";

describe("moeda", () => {
  it("formata em reais", () => {
    expect(formatarMoeda(129999.9)).toBe("R$ 129.999,90");
    expect(formatarMoeda(42000)).toBe("R$ 42.000,00");
    expect(formatarMoeda(null)).toBe("—");
  });
  it("interpreta texto digitado", () => {
    expect(parseMoeda("129.999,90")).toBe(129999.9);
    expect(parseMoeda("R$ 96.900,00")).toBe(96900);
    expect(parseMoeda("42.000")).toBe(42000);
    expect(parseMoeda("45999.90")).toBe(45999.9);
    expect(parseMoeda("")).toBeNull();
  });
  it("máscara de digitação desloca os centavos", () => {
    expect(mascararMoedaDigitada("12999990")).toBe("129.999,90");
    expect(mascararMoedaDigitada("5")).toBe("0,05");
  });
});

describe("datas", () => {
  it("formata dd/mm/aaaa sem deslocar fuso", () => {
    expect(formatarData("2026-01-01")).toBe("01/01/2026");
    expect(formatarData("2026-11-19T02:30:00Z")).toBe("18/11/2026"); // 23:30 em Brasília
  });
  it("interpreta dd/mm/aaaa", () => {
    expect(parseDataBR("19/11/2026")).toBe("2026-11-19");
    expect(parseDataBR("31/02/2026")).toBeNull();
  });
  it("calcula dias e vencimentos", () => {
    expect(diasEntre("2026-01-01", "2026-03-01")).toBe(59);
    expect(somarDias("2026-11-19", 90)).toBe("2027-02-17");
    expect(fimDoMes("2028-02-10")).toBe("2028-02-29");
    expect(hojeISO(new Date("2026-11-19T02:00:00Z"))).toBe("2026-11-18");
  });
});

describe("documentos", () => {
  it("valida CPF e CNPJ", () => {
    expect(validarCPF("529.982.247-25")).toBe(true);
    expect(validarCPF("111.111.111-11")).toBe(false);
    expect(validarCPF("529.982.247-24")).toBe(false);
    expect(validarCNPJ("11.222.333/0001-81")).toBe(true);
    expect(validarCNPJ("11.222.333/0001-82")).toBe(false);
  });
  it("formata e mascara (LGPD)", () => {
    expect(formatarDocumento("52998224725")).toBe("529.982.247-25");
    expect(formatarDocumento("11222333000181")).toBe("11.222.333/0001-81");
    expect(mascararCPF("52998224725")).toBe("***.982.247-**");
  });
});

describe("veículo", () => {
  it("valida placas antiga e Mercosul", () => {
    expect(validarPlaca("abc-1234")).toBe(true);
    expect(validarPlaca("ABC1D23")).toBe(true);
    expect(validarPlaca("AB12345")).toBe(false);
    expect(formatarPlaca("abc1234")).toBe("ABC-1234");
    expect(formatarPlaca("abc1d23")).toBe("ABC1D23");
  });
  it("valida RENAVAM e chassi", () => {
    expect(validarRenavam("00639884962")).toBe(true);
    expect(validarRenavam("00639884961")).toBe(false);
    expect(validarChassi("9BWZZZ377VT004251")).toBe(true);
    expect(validarChassi("9BWZZZ377VT00425O")).toBe(false);
  });
  it("formata km", () => {
    expect(formatarKm(40000)).toBe("40.000 km");
  });
});

describe("telefone", () => {
  it("formata e converte para o WhatsApp", () => {
    expect(formatarTelefone("37991193815")).toBe("(37) 99119-3815");
    expect(telefoneInternacional("(37) 99119-3815")).toBe("5537991193815");
    expect(telefoneInternacional("123")).toBeNull();
  });
});
