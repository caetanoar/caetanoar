import { describe, expect, it } from "vitest";
import { validarTexto, removerTrechosProibidos } from "@/lib/ia/validador";
import { montarLegenda, tituloAnuncio, pendenciasAnuncio, limitar, type DadosAnuncio } from "@/lib/ia/legenda";
import { limparDadosPessoais, primeiroNome } from "@/lib/ia/privacidade";
import { anuncioSimulado, clienteSimulado } from "@/lib/ia/simulado";

const cfg = { regiao_anuncio: "Divinópolis e região", assinatura: "Caetano Auto, carros com procedência e história.", telefones_assinatura: "(37) 99119-3815 | (37) 99867-8978" };

const ka: DadosAnuncio = {
  marca: "Ford", modelo: "Ka", versao: "1.0 SE", motor: "1.0", ano_fabricacao: 2018, ano_modelo: 2018, cor: "Branco", km: null,
  combustivel: "flex", cambio: null, portas: 4, preco_anunciado: 42000, laudo_cautelar: false, laudo_resultado: null, descricao: null,
  itens_confirmados: [], historico: [{ descricao: "Para-choques dianteiro e traseiro repintados", comprovado: true, tipo: "pintura" }],
};

const tcross: DadosAnuncio = {
  ...ka, marca: "Volkswagen", modelo: "T-Cross", versao: "200 TSI", motor: "1.0", ano_fabricacao: 2025, ano_modelo: 2026, km: 40000,
  cambio: "automatico", preco_anunciado: 129999.9, itens_confirmados: ["Multimídia com Android Auto", "Câmera de ré"], historico: [{ descricao: "Revisões em dia", comprovado: true, tipo: "revisao" }],
  laudo_cautelar: true, laudo_resultado: "aprovado",
};

describe("validador de anúncios", () => {
  it("bloqueia 'estado de novo' e 'sem problemas' sem laudo, com ou sem acento e caixa", () => {
    const ctx = { laudoAprovado: false };
    expect(validarTexto("Carro em ESTADO DE NOVO, sem problemas!", ctx)).toEqual(["estado de novo", "sem problemas"]);
    expect(validarTexto("Impecável e nunca bateu", ctx)).toEqual(expect.arrayContaining(["impecável", "nunca bateu"]));
    expect(validarTexto("Sem nenhum problema mecânico", ctx)).toContain("sem problemas");
    expect(validarTexto("Carro muito bem cuidado, revisado.", ctx)).toEqual([]);
  });

  it("libera as expressões quando há laudo cautelar aprovado", () => {
    expect(validarTexto("Estado de novo, sem problemas", { laudoAprovado: true })).toEqual([]);
  });

  it("'único dono' só passa se estiver comprovado", () => {
    expect(validarTexto("Único dono", { laudoAprovado: true })).toEqual(["único dono"]);
    expect(validarTexto("Único dono", { laudoAprovado: true, comprovados: ["Único dono desde 0 km"] })).toEqual([]);
  });

  it("remove só as frases com expressões proibidas", () => {
    const t = "Ford Ka bem conservado. Está em estado de novo! Aceita troca.";
    expect(removerTrechosProibidos(t, { laudoAprovado: false })).toBe("Ford Ka bem conservado. Aceita troca.");
  });
});

describe("legenda do Instagram (formato fixo)", () => {
  it("título em caixa alta sem repetir o motor que já está na versão", () => {
    expect(tituloAnuncio(ka)).toBe("FORD KA 1.0 SE 2018");
    expect(tituloAnuncio(tcross)).toBe("VOLKSWAGEN T-CROSS 200 TSI 2025/26 1.0 AUTOMÁTICO");
  });

  it("sem itens confirmados e sem km: nada de ✅ inventado (repintura comprovada é informação, não vantagem)", () => {
    const l = montarLegenda(ka, "Ford Ka disponível.", cfg);
    expect(l.startsWith("FORD KA 1.0 SE 2018\n\nFord Ka disponível.")).toBe(true);
    expect(l).not.toContain("✅");
    expect(l).toContain("ℹ️ Para-choques dianteiro e traseiro repintados");
    expect(l).toContain("🛣️ Quilometragem: consulte no privado");
    expect(l).toContain("⚙️ Câmbio: consulte no privado");
    expect(l).toContain("ℹ️ Itens e opcionais: consulte no privado");
    expect(l).not.toMatch(/laudo/i);
  });

  it("itens confirmados, histórico comprovado e laudo aprovado viram ✅; linhas fixas e assinatura no fim", () => {
    const l = montarLegenda(tcross, "Frase.", cfg);
    expect(l).toContain("✅ Multimídia com Android Auto");
    expect(l).toContain("✅ Revisões em dia");
    expect(l).toContain("✅ Laudo cautelar aprovado");
    expect(l).toContain("🛣️ 40.000 km");
    expect(l.split("\n").slice(-7)).toEqual([
      "📍 Divinópolis e região",
      "💰 R$ 129.999,90",
      "🔁 Aceita troca e financiamento",
      "💬 Chama no direct ou no WhatsApp",
      "",
      "Caetano Auto, carros com procedência e história.",
      "📲 (37) 99119-3815 | (37) 99867-8978",
    ]);
  });

  it("lista as pendências do cadastro", () => {
    expect(pendenciasAnuncio(ka)).toEqual(["quilometragem", "câmbio", "itens confirmados"]);
    expect(pendenciasAnuncio(tcross)).toEqual([]);
  });

  it("limita títulos sem cortar palavra", () => {
    expect(limitar("Volkswagen T-Cross 200 TSI Highline Automático 2025 2026 completo", 40)).toBe("Volkswagen T-Cross 200 TSI Highline");
  });
});

describe("privacidade (LGPD)", () => {
  it("mascara CPF, CNPJ, telefone e e-mail em texto livre", () => {
    const t = limparDadosPessoais("CPF 529.982.247-25, CNPJ 11.444.777/0001-61, fone (37) 99119-3815, mail joao@x.com.br, 52998224725");
    expect(t).toBe("CPF [documento], CNPJ [documento], fone [telefone], mail [e-mail], [documento]");
  });
  it("usa só o primeiro nome", () => {
    expect(primeiroNome("JOÃO da Silva Pereira")).toBe("João");
    expect(primeiroNome("")).toBe("Cliente");
  });
});

describe("modo simulado", () => {
  it("não inventa itens nem promete estado", () => {
    const s = anuncioSimulado(ka);
    const tudo = [s.frase_instagram, s.olx.titulo, s.olx.descricao, s.marketplace.titulo, s.marketplace.descricao].join("\n");
    expect(validarTexto(tudo, { laudoAprovado: false })).toEqual([]);
    expect(s.olx.titulo.length).toBeLessThanOrEqual(70);
    expect(tudo).not.toMatch(/\d{2}\)?\s?9\d{4}/);
  });

  it("sugere carro compatível e trata pelo primeiro nome", () => {
    const s = clienteSimulado({
      primeiro_nome: "Maria", vendedor: "Vendedor", origem: "Instagram", etapa: "em negociação", motivo_perda: null, dias_desde_cadastro: 5,
      dias_desde_ultimo_contato: 1, proximo_contato_marcado: null, interesses: [{ descricao: "SUV automático", faixa_preco: "até R$ 130.000,00", veiculo: null }],
      contatos: [{ data: "18/11/2026", canal: "WhatsApp", resumo: "Pediu fotos do T-Cross", resultado: null, proximo_passo: "Mandar vídeo" }],
      compras: [], estoque_compativel: [{ id: "v1", nome: "Volkswagen T-Cross 200 TSI 2026", preco: 129999.9 }],
    });
    expect(s.temperatura).toBe("quente");
    expect(s.resumo).toContain("Último contato ontem");
    expect(s.proximo_passo).toBe("Mandar vídeo");
    expect(s.mensagem_whatsapp).toMatch(/^Oi, Maria!/);
    expect(s.veiculos_sugeridos).toEqual(["v1"]);
  });
});
