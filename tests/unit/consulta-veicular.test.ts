import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { criarProvedorSimulado } from "@/lib/integracoes/consulta-veicular/mock";
import { calcularSelo, chassiConfere, fraseNadaEncontrado, itensNaoVerificados, semDadosPessoais } from "@/lib/consulta-veicular/regras";
import { validarTextoConsulta } from "@/lib/ia/validador";

const mock = criarProvedorSimulado();

describe("provedor simulado", () => {
  it("final 3: nada encontrado, selo verde", async () => {
    const r = await mock.consultar("ABC1D23");
    expect(r.status).toBe("encontrado");
    expect(calcularSelo(r.verificacoes)).toBe("verde");
    expect(r.dados.uf).toBe("MG");
    expect(r.verificacoes.recall.estado).toBe("nao_verificado");
  });
  it("final 5: leilão e IPVA, selo amarelo", async () => {
    const r = await mock.consultar("ABC1D25");
    expect(r.verificacoes.leilao.estado).toBe("encontrado");
    expect(calcularSelo(r.verificacoes)).toBe("amarelo");
  });
  it("final 7: roubo/furto, selo vermelho", async () => {
    const r = await mock.consultar("ABC1D27");
    expect(calcularSelo(r.verificacoes)).toBe("vermelho");
  });
  it("final 9: placa não encontrada", async () => {
    const r = await mock.consultar("ABC1D29");
    expect(r.status).toBe("nao_encontrado");
  });
  it("é determinístico", async () => {
    expect((await mock.consultar("XYZ9W83")).dados).toEqual((await mock.consultar("XYZ9W83")).dados);
  });
});

describe("selo e textos", () => {
  it("não verificado nunca conta como nada encontrado", () => {
    const v = { roubo_furto: { estado: "nao_verificado" as const }, leilao: { estado: "nada_encontrado" as const } };
    expect(calcularSelo(v)).toBe("verde");
    expect(itensNaoVerificados(v)).toContain("Roubo ou furto");
    expect(itensNaoVerificados(v)).not.toContain("Passagem por leilão");
  });
  it("gravame e restrição são impeditivos; débitos são atenção", () => {
    expect(calcularSelo({ gravame: { estado: "encontrado" } })).toBe("vermelho");
    expect(calcularSelo({ restricoes: { estado: "encontrado" } })).toBe("vermelho");
    expect(calcularSelo({ multas: { estado: "encontrado" } })).toBe("amarelo");
  });
  it("frase padrão cita data e provedor", () => {
    expect(fraseNadaEncontrado("2026-11-20T13:30:00Z", "Simulado")).toBe("Nenhum registro encontrado na consulta de 20/11/2026 10:30 (Simulado).");
  });
});

describe("LGPD e chassi", () => {
  it("remove dados do proprietário do retorno bruto", () => {
    const limpo = semDadosPessoais({ placa: "ABC1D23", proprietario: { nome: "X", cpf: "1" }, dados: { cpf_cnpj: "2", cor: "Prata" }, lista: [{ owner_name: "Y", ano: 2020 }] });
    expect(limpo).toEqual({ placa: "ABC1D23", dados: { cor: "Prata" }, lista: [{ ano: 2020 }] });
  });
  it("compara chassi parcial com o completo", () => {
    expect(chassiConfere("9BW********123456", "9BWZZZ37ZRT123456")).toBe(true);
    expect(chassiConfere("9BW********123456", "9BDZZZ37ZRT123456")).toBe(false);
    expect(chassiConfere("9BW*", "9BWZZZ37ZRT123456")).toBeNull();
    expect(chassiConfere(null, "9BWZZZ37ZRT123456")).toBeNull();
  });
});

describe("palavras proibidas", () => {
  it("validador recusa promessas", () => {
    expect(validarTextoConsulta("Carro limpo, garantido e sem problemas")).toEqual(["carro limpo", "garantido", "sem problemas"]);
    expect(validarTextoConsulta("Garantia de 90 dias. Nenhum registro encontrado na consulta.")).toEqual([]);
  });

  it("nenhuma tela, PDF ou texto do sistema usa 'carro limpo', 'garantido' ou 'sem problemas'", () => {
    // Permitidos: o próprio validador e as instruções que dizem à IA para NÃO usar essas palavras.
    const permitidos = ["lib/ia/validador.ts", "lib/ia/prompts.ts"];
    const achados: string[] = [];
    const varrer = (dir: string) => {
      for (const nome of readdirSync(dir)) {
        const p = join(dir, nome);
        if (statSync(p).isDirectory()) varrer(p);
        else if (/\.(tsx?|sql)$/.test(nome) && !permitidos.includes(p)) {
          readFileSync(p, "utf8").split("\n").forEach((linha, i) => {
            if (/carro limpo|garantid[oa]s?\b|sem (nenhum |qualquer )?problemas?/i.test(linha) && !/^\s*(\/\/|\/?\*|--)/.test(linha)) achados.push(`${p}:${i + 1}`);
          });
        }
      }
    };
    ["app", "components", "lib"].forEach(varrer);
    expect(achados).toEqual([]);
  });
});
