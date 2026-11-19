import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ORIGEM_LEAD, ETAPA_FUNIL, MOTIVO_PERDA } from "@/lib/clientes/rotulos";
import { STATUS_VEICULO, TIPO_VEICULO, nomeVeiculo } from "@/lib/estoque/rotulos";
import { STATUS_NOTA } from "@/lib/fiscal/rotulos";
import { NATUREZA } from "@/lib/financeiro/rotulos";
import { diasEntre } from "@/lib/format/data";

export type TipoColuna = "texto" | "moeda" | "data" | "numero" | "percentual";
export type Coluna = { chave: string; rotulo: string; tipo: TipoColuna };
export type Linha = Record<string, string | number | null>;
export type Relatorio = {
  titulo: string;
  colunas: Coluna[];
  linhas: Linha[];
  resumo: { rotulo: string; valor: string | number; tipo?: TipoColuna }[];
  observacao?: string;
};

export const TIPOS_RELATORIO = {
  vendas: { titulo: "Vendas", descricao: "Vendas fechadas, formas de pagamento, lucro e comissão por venda" },
  carros: { titulo: "Carros", descricao: "Estoque atual, custo, margem, dias em estoque e carros vendidos" },
  clientes: { titulo: "Clientes", descricao: "Leads por origem, funil, conversão e motivos de perda" },
  financeiro: { titulo: "Financeiro", descricao: "Resultado por categoria, fluxo de caixa e visão para o contador" },
  fiscal: { titulo: "Fiscal", descricao: "NF-e de entrada e saída, totais por CFOP e vendas sem nota" },
  vendedores: { titulo: "Vendedores", descricao: "Vendas, faturamento, lucro, comissão e meta por vendedor" },
} as const;

export type TipoRelatorio = keyof typeof TIPOS_RELATORIO;

const n = (v: unknown) => Number(v ?? 0);
const soma = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + f(x), 0);

export async function gerarRelatorio(tipo: TipoRelatorio, de: string, ate: string): Promise<Relatorio> {
  const supabase = await criarClienteServidor();

  switch (tipo) {
    case "vendas": {
      const { data: vendas } = await supabase.from("v_vendas").select("*").eq("status", "fechada").gte("data_venda", de).lte("data_venda", ate).order("data_venda");
      const ids = (vendas ?? []).map((v) => v.id!);
      const { data: lucros } = ids.length ? await supabase.from("v_lucro_vendas_calc").select("venda_id, lucro, comissao_vendedor, comissao_loja").in("venda_id", ids) : { data: [] };
      const mapa = new Map((lucros ?? []).map((l) => [l.venda_id, l]));
      const linhas: Linha[] = (vendas ?? []).map((v) => ({
        numero: v.numero, data: v.data_venda, veiculo: v.veiculo_nome, tipo: TIPO_VEICULO[v.tipo_veiculo ?? "proprio"], cliente: v.cliente_nome,
        vendedor: v.vendedor_nome, formas: v.formas ? `${v.formas}${v.qtd_trocas ? ", troca" : ""}` : v.qtd_trocas ? "troca" : "", valor: n(v.valor_venda),
        entrada: n(v.valor_entrada), comissao_loja: n(mapa.get(v.id!)?.comissao_loja), comissao_vendedor: n(mapa.get(v.id!)?.comissao_vendedor), lucro: n(mapa.get(v.id!)?.lucro),
      }));
      const total = soma(linhas, (l) => n(l.valor));
      return {
        titulo: "Relatório de vendas",
        colunas: [
          { chave: "numero", rotulo: "Venda", tipo: "texto" }, { chave: "data", rotulo: "Data", tipo: "data" }, { chave: "veiculo", rotulo: "Veículo", tipo: "texto" },
          { chave: "tipo", rotulo: "Tipo", tipo: "texto" }, { chave: "cliente", rotulo: "Cliente", tipo: "texto" }, { chave: "vendedor", rotulo: "Vendedor", tipo: "texto" },
          { chave: "formas", rotulo: "Pagamento", tipo: "texto" }, { chave: "valor", rotulo: "Valor", tipo: "moeda" }, { chave: "entrada", rotulo: "Entrada", tipo: "moeda" },
          { chave: "comissao_loja", rotulo: "Comissão loja", tipo: "moeda" }, { chave: "comissao_vendedor", rotulo: "Comissão vendedor", tipo: "moeda" }, { chave: "lucro", rotulo: "Lucro", tipo: "moeda" },
        ],
        linhas,
        resumo: [
          { rotulo: "Vendas", valor: linhas.length, tipo: "numero" },
          { rotulo: "Valor vendido", valor: total, tipo: "moeda" },
          { rotulo: "Ticket médio", valor: linhas.length ? total / linhas.length : 0, tipo: "moeda" },
          { rotulo: "Lucro", valor: soma(linhas, (l) => n(l.lucro)), tipo: "moeda" },
          { rotulo: "Carros próprios", valor: linhas.filter((l) => l.tipo === "Próprio").length, tipo: "numero" },
          { rotulo: "Consignados", valor: linhas.filter((l) => l.tipo === "Consignado").length, tipo: "numero" },
          { rotulo: "Financiadas", valor: linhas.filter((l) => String(l.formas).includes("financiamento")).length, tipo: "numero" },
          { rotulo: "Com troca", valor: linhas.filter((l) => String(l.formas).includes("troca")).length, tipo: "numero" },
        ],
      };
    }

    case "carros": {
      const [{ data: estoque }, { data: vendidos }] = await Promise.all([
        supabase.from("v_veiculos_gestao").select("*").in("status", ["em_preparacao", "disponivel", "reservado"]).order("data_entrada"),
        supabase.from("v_veiculos_gestao").select("*").eq("status", "vendido").gte("data_saida", de).lte("data_saida", ate).order("data_saida"),
      ]);
      const ids = (vendidos ?? []).map((v) => v.id!);
      const { data: vendas } = ids.length ? await supabase.from("vendas").select("id, veiculo_id, valor_venda").eq("status", "fechada").in("veiculo_id", ids) : { data: [] };
      const vendaIds = (vendas ?? []).map((v) => v.id);
      const { data: lucros } = vendaIds.length ? await supabase.from("v_lucro_vendas_calc").select("venda_id, lucro").in("venda_id", vendaIds) : { data: [] };
      const lucroVeiculo = new Map((vendas ?? []).map((v) => [v.veiculo_id, { valor: n(v.valor_venda), lucro: n((lucros ?? []).find((l) => l.venda_id === v.id)?.lucro) }]));
      const linha = (v: NonNullable<typeof estoque>[number]): Linha => ({
        placa: v.placa, veiculo: nomeVeiculo({ marca: v.marca!, modelo: v.modelo!, versao: v.versao }), ano: v.ano_modelo ? String(v.ano_modelo) : null, tipo: TIPO_VEICULO[v.tipo!],
        status: STATUS_VEICULO[v.status!].rotulo, entrada: v.data_entrada, dias: v.dias_em_estoque, anunciado: n(v.preco_anunciado), custo: n(v.custo_total),
        margem_lucro: v.status === "vendido" ? lucroVeiculo.get(v.id!)?.lucro ?? null : v.margem_prevista !== null ? n(v.margem_prevista) : null,
        vendido_por: v.status === "vendido" ? lucroVeiculo.get(v.id!)?.valor ?? null : null,
      });
      const est = (estoque ?? []).map(linha);
      const vend = (vendidos ?? []).map(linha);
      return {
        titulo: "Relatório de carros",
        colunas: [
          { chave: "placa", rotulo: "Placa", tipo: "texto" }, { chave: "veiculo", rotulo: "Veículo", tipo: "texto" }, { chave: "ano", rotulo: "Ano", tipo: "texto" },
          { chave: "tipo", rotulo: "Tipo", tipo: "texto" }, { chave: "status", rotulo: "Situação", tipo: "texto" }, { chave: "entrada", rotulo: "Entrada", tipo: "data" },
          { chave: "dias", rotulo: "Dias", tipo: "numero" }, { chave: "anunciado", rotulo: "Anunciado", tipo: "moeda" }, { chave: "custo", rotulo: "Custo", tipo: "moeda" },
          { chave: "vendido_por", rotulo: "Vendido por", tipo: "moeda" }, { chave: "margem_lucro", rotulo: "Margem prevista / lucro", tipo: "moeda" },
        ],
        linhas: [...est, ...vend],
        resumo: [
          { rotulo: "Em estoque", valor: est.length, tipo: "numero" },
          { rotulo: "Valor anunciado", valor: soma(est, (l) => n(l.anunciado)), tipo: "moeda" },
          { rotulo: "Custo dos próprios", valor: soma(est.filter((l) => l.tipo === "Próprio"), (l) => n(l.custo)), tipo: "moeda" },
          { rotulo: "Média de dias em estoque", valor: est.length ? Math.round(soma(est, (l) => n(l.dias)) / est.length) : 0, tipo: "numero" },
          { rotulo: "Vendidos no período", valor: vend.length, tipo: "numero" },
          { rotulo: "Dias até vender (média)", valor: vend.length ? Math.round(soma(vend, (l) => n(l.dias)) / vend.length) : 0, tipo: "numero" },
          { rotulo: "Lucro dos vendidos", valor: soma(vend, (l) => n(l.margem_lucro)), tipo: "moeda" },
        ],
      };
    }

    case "clientes": {
      const { data } = await supabase.from("v_clientes").select("id, nome, origem, vendedor_nome, etapa, motivo_perda, criado_em, ultimo_contato_em, interesses").is("anonimizado_em", null).gte("criado_em", `${de}T00:00:00-03:00`).lte("criado_em", `${ate}T23:59:59-03:00`).order("criado_em");
      const linhas: Linha[] = (data ?? []).map((c) => ({
        nome: c.nome, origem: ORIGEM_LEAD[c.origem!], vendedor: c.vendedor_nome, etapa: ETAPA_FUNIL[c.etapa!].rotulo,
        motivo: c.motivo_perda ? MOTIVO_PERDA[c.motivo_perda] : null, interesse: c.interesses, criado: c.criado_em?.slice(0, 10) ?? null, ultimo_contato: c.ultimo_contato_em?.slice(0, 10) ?? null,
      }));
      const ganhos = linhas.filter((l) => l.etapa === "Ganho").length;
      const perdidos = linhas.filter((l) => l.etapa === "Perdido").length;
      const porOrigem = Object.values(ORIGEM_LEAD).map((o) => ({ o, q: linhas.filter((l) => l.origem === o).length })).filter((x) => x.q > 0);
      const porMotivo = Object.values(MOTIVO_PERDA).map((m) => ({ m, q: linhas.filter((l) => l.motivo === m).length })).filter((x) => x.q > 0);
      return {
        titulo: "Relatório de clientes",
        colunas: [
          { chave: "nome", rotulo: "Cliente", tipo: "texto" }, { chave: "origem", rotulo: "Origem", tipo: "texto" }, { chave: "vendedor", rotulo: "Vendedor", tipo: "texto" },
          { chave: "etapa", rotulo: "Etapa", tipo: "texto" }, { chave: "motivo", rotulo: "Motivo da perda", tipo: "texto" }, { chave: "interesse", rotulo: "Interesse", tipo: "texto" },
          { chave: "criado", rotulo: "Cadastro", tipo: "data" }, { chave: "ultimo_contato", rotulo: "Último contato", tipo: "data" },
        ],
        linhas,
        resumo: [
          { rotulo: "Novos clientes", valor: linhas.length, tipo: "numero" },
          { rotulo: "Ganhos", valor: ganhos, tipo: "numero" },
          { rotulo: "Perdidos", valor: perdidos, tipo: "numero" },
          { rotulo: "Conversão (ganhos ÷ fechados)", valor: ganhos + perdidos ? (ganhos / (ganhos + perdidos)) * 100 : 0, tipo: "percentual" },
          ...porOrigem.map((x) => ({ rotulo: `Origem: ${x.o}`, valor: x.q, tipo: "numero" as const })),
          ...porMotivo.map((x) => ({ rotulo: `Perda: ${x.m}`, valor: x.q, tipo: "numero" as const })),
        ],
        observacao: "CPF e dados pessoais não entram nos relatórios (LGPD).",
      };
    }

    case "financeiro": {
      const [{ data: competencia }, { data: caixa }, { data: saldos }, { data: comissoesLoja }, { data: lucros }] = await Promise.all([
        supabase.from("v_lancamentos").select("tipo, valor, categoria_nome, categoria_grupo, natureza").neq("status", "cancelado").in("tipo", ["receita", "despesa"]).gte("data_competencia", de).lte("data_competencia", ate),
        supabase.from("v_lancamentos").select("tipo, valor, conta_nome, natureza").eq("status", "pago").gte("data_pagamento", de).lte("data_pagamento", ate),
        supabase.from("v_saldos_contas").select("saldo_atual"),
        supabase.from("comissoes").select("valor, lancamento_id, vendas!inner(data_venda)").eq("tipo", "loja_consignado").neq("status", "cancelada").gte("vendas.data_venda", de).lte("vendas.data_venda", ate),
        supabase.from("v_lucro_vendas_calc").select("tipo_veiculo, valor_venda, valor_compra, custos").gte("data_venda", de).lte("data_venda", ate),
      ]);
      const mapa = new Map<string, Linha>();
      for (const l of competencia ?? []) {
        const chave = `${l.tipo}|${l.categoria_nome}`;
        const atual = mapa.get(chave) ?? { tipo: l.tipo === "receita" ? "Receita" : "Despesa", grupo: l.categoria_grupo, categoria: l.categoria_nome, natureza: NATUREZA[l.natureza!], valor: 0 };
        atual.valor = n(atual.valor) + n(l.valor);
        mapa.set(chave, atual);
      }
      // Comissão retida do repasse (loja recebe e repassa): não vira lançamento próprio, mas é receita da loja.
      const retidas = soma((comissoesLoja ?? []).filter((c) => !c.lancamento_id), (c) => n(c.valor));
      if (retidas > 0) {
        mapa.set("retidas", { tipo: "Receita", grupo: "Comissões", categoria: "Comissão de consignação (retida do repasse)", natureza: NATUREZA.operacional, valor: retidas });
      }
      const linhas = [...mapa.values()].sort((a, b) => String(a.tipo).localeCompare(String(b.tipo)) || n(b.valor) - n(a.valor));
      const op = (t: string) =>
        soma((competencia ?? []).filter((l) => l.tipo === t && l.natureza === "operacional"), (l) => n(l.valor)) + (t === "receita" ? retidas : 0);
      const terc = (t: string) => soma((competencia ?? []).filter((l) => l.tipo === t && l.natureza === "terceiros"), (l) => n(l.valor));
      const estoqueCompras = soma((competencia ?? []).filter((l) => l.natureza === "estoque"), (l) => n(l.valor));
      const entradas = soma((caixa ?? []).filter((l) => l.tipo === "receita" || l.tipo === "transferencia_entrada"), (l) => n(l.valor));
      const saidas = soma((caixa ?? []).filter((l) => l.tipo === "despesa" || l.tipo === "transferencia_saida"), (l) => n(l.valor));
      const proprios = (lucros ?? []).filter((l) => l.tipo_veiculo === "proprio");
      return {
        titulo: "Relatório financeiro",
        colunas: [
          { chave: "tipo", rotulo: "Tipo", tipo: "texto" }, { chave: "grupo", rotulo: "Grupo", tipo: "texto" }, { chave: "categoria", rotulo: "Categoria", tipo: "texto" },
          { chave: "natureza", rotulo: "Natureza", tipo: "texto" }, { chave: "valor", rotulo: "Valor (competência)", tipo: "moeda" },
        ],
        linhas,
        resumo: [
          { rotulo: "Receitas operacionais", valor: op("receita"), tipo: "moeda" },
          { rotulo: "Despesas operacionais", valor: op("despesa"), tipo: "moeda" },
          { rotulo: "Resultado operacional", valor: op("receita") - op("despesa"), tipo: "moeda" },
          { rotulo: "Compras de veículos (estoque)", valor: estoqueCompras, tipo: "moeda" },
          { rotulo: "Entradas de caixa (pagas)", valor: entradas, tipo: "moeda" },
          { rotulo: "Saídas de caixa (pagas)", valor: saidas, tipo: "moeda" },
          { rotulo: "Saldo atual (todas as contas)", valor: soma(saldos ?? [], (s) => n(s.saldo_atual)), tipo: "moeda" },
          { rotulo: "Contador: comissões de consignação", valor: soma(comissoesLoja ?? [], (c) => n(c.valor)), tipo: "moeda" },
          { rotulo: "Contador: valores de terceiros recebidos", valor: terc("receita"), tipo: "moeda" },
          { rotulo: "Contador: valores de terceiros repassados", valor: terc("despesa"), tipo: "moeda" },
          { rotulo: "Contador: margem dos próprios (venda − compra)", valor: soma(proprios, (l) => n(l.valor_venda) - n(l.valor_compra)), tipo: "moeda" },
        ],
        observacao: "Valores de terceiros (dinheiro do consignante) não entram na receita da loja. Confirme o tratamento fiscal com o contador.",
      };
    }

    case "fiscal": {
      const [{ data: notas }, { data: semNota }] = await Promise.all([
        supabase.from("v_notas_fiscais").select("*").gte("criado_em", `${de}T00:00:00-03:00`).lte("criado_em", `${ate}T23:59:59-03:00`).order("criado_em"),
        supabase.from("v_vendas_sem_nota").select("id").gte("data_venda", de).lte("data_venda", ate),
      ]);
      const linhas: Linha[] = (notas ?? []).map((x) => ({
        data: (x.data_emissao ?? x.criado_em)?.slice(0, 10) ?? null, direcao: x.direcao === "entrada" ? "Entrada" : "Saída", numero: `${x.numero ?? "—"}${x.serie ? `/${x.serie}` : ""}`,
        pessoa: x.direcao === "entrada" ? x.emitente_nome : x.destinatario_nome, cfop: x.cfop, valor: n(x.valor_total),
        status: `${STATUS_NOTA[x.status!].rotulo}${x.simulada ? " (simulada)" : ""}`, chave: x.chave_acesso,
      }));
      const cfops = [...new Set(linhas.map((l) => l.cfop).filter(Boolean))] as string[];
      const validas = (notas ?? []).filter((x) => !x.simulada && x.status !== "cancelada");
      return {
        titulo: "Relatório fiscal",
        colunas: [
          { chave: "data", rotulo: "Data", tipo: "data" }, { chave: "direcao", rotulo: "Direção", tipo: "texto" }, { chave: "numero", rotulo: "Número", tipo: "texto" },
          { chave: "pessoa", rotulo: "Emitente / destinatário", tipo: "texto" }, { chave: "cfop", rotulo: "CFOP", tipo: "texto" }, { chave: "valor", rotulo: "Valor", tipo: "moeda" },
          { chave: "status", rotulo: "Situação", tipo: "texto" }, { chave: "chave", rotulo: "Chave de acesso", tipo: "texto" },
        ],
        linhas,
        resumo: [
          { rotulo: "Notas de entrada", valor: validas.filter((x) => x.direcao === "entrada").length, tipo: "numero" },
          { rotulo: "Total de entradas", valor: soma(validas.filter((x) => x.direcao === "entrada"), (x) => n(x.valor_total)), tipo: "moeda" },
          { rotulo: "Notas de saída autorizadas", valor: validas.filter((x) => x.direcao === "saida" && x.status === "autorizada").length, tipo: "numero" },
          { rotulo: "Total de saídas", valor: soma(validas.filter((x) => x.direcao === "saida" && x.status === "autorizada"), (x) => n(x.valor_total)), tipo: "moeda" },
          { rotulo: "Canceladas", valor: (notas ?? []).filter((x) => x.status === "cancelada").length, tipo: "numero" },
          { rotulo: "Vendas fechadas sem NF-e", valor: semNota?.length ?? 0, tipo: "numero" },
          ...cfops.map((c) => ({ rotulo: `CFOP ${c}`, valor: soma(linhas.filter((l) => l.cfop === c), (l) => n(l.valor)), tipo: "moeda" as const })),
        ],
        observacao: "Notas simuladas não entram nos totais.",
      };
    }

    case "vendedores": {
      const mesIni = `${de.slice(0, 7)}-01`;
      const [{ data: vendas }, { data: clientes }, { data: vendedores }, { data: metas }] = await Promise.all([
        supabase.from("v_vendas").select("id, vendedor_id, valor_venda").eq("status", "fechada").gte("data_venda", de).lte("data_venda", ate),
        supabase.from("clientes").select("vendedor_id, etapa").gte("criado_em", `${de}T00:00:00-03:00`).lte("criado_em", `${ate}T23:59:59-03:00`),
        supabase.rpc("listar_vendedores"),
        supabase.from("metas").select("vendedor_id, meta_qtd_vendas, meta_faturamento").eq("mes", mesIni),
      ]);
      const ids = (vendas ?? []).map((v) => v.id!);
      const { data: lucros } = ids.length ? await supabase.from("v_lucro_vendas_calc").select("venda_id, lucro, comissao_vendedor").in("venda_id", ids) : { data: [] };
      const lm = new Map((lucros ?? []).map((l) => [l.venda_id, l]));
      const linhas: Linha[] = (vendedores ?? []).map((u) => {
        const vs = (vendas ?? []).filter((v) => v.vendedor_id === u.id);
        const cs = (clientes ?? []).filter((c) => c.vendedor_id === u.id);
        const fat = soma(vs, (v) => n(v.valor_venda));
        const meta = (metas ?? []).find((m) => m.vendedor_id === u.id);
        const fechados = cs.filter((c) => c.etapa === "ganho" || c.etapa === "perdido").length;
        return {
          vendedor: u.nome, vendas: vs.length, faturamento: fat, ticket: vs.length ? fat / vs.length : 0,
          lucro: soma(vs, (v) => n(lm.get(v.id!)?.lucro)), comissao: soma(vs, (v) => n(lm.get(v.id!)?.comissao_vendedor)),
          clientes_novos: cs.length, conversao: fechados ? (cs.filter((c) => c.etapa === "ganho").length / fechados) * 100 : null,
          meta_vendas: meta?.meta_qtd_vendas ?? null, atingimento: meta?.meta_qtd_vendas ? (vs.length / meta.meta_qtd_vendas) * 100 : null,
        };
      }).filter((l) => n(l.vendas) > 0 || n(l.clientes_novos) > 0 || l.meta_vendas !== null);
      return {
        titulo: "Relatório de vendedores",
        colunas: [
          { chave: "vendedor", rotulo: "Vendedor", tipo: "texto" }, { chave: "vendas", rotulo: "Vendas", tipo: "numero" }, { chave: "faturamento", rotulo: "Faturamento", tipo: "moeda" },
          { chave: "ticket", rotulo: "Ticket médio", tipo: "moeda" }, { chave: "lucro", rotulo: "Lucro", tipo: "moeda" }, { chave: "comissao", rotulo: "Comissão", tipo: "moeda" },
          { chave: "clientes_novos", rotulo: "Clientes novos", tipo: "numero" }, { chave: "conversao", rotulo: "Conversão", tipo: "percentual" },
          { chave: "meta_vendas", rotulo: "Meta (vendas)", tipo: "numero" }, { chave: "atingimento", rotulo: "Atingimento", tipo: "percentual" },
        ],
        linhas,
        resumo: [
          { rotulo: "Vendas", valor: soma(linhas, (l) => n(l.vendas)), tipo: "numero" },
          { rotulo: "Faturamento", valor: soma(linhas, (l) => n(l.faturamento)), tipo: "moeda" },
          { rotulo: "Comissões", valor: soma(linhas, (l) => n(l.comissao)), tipo: "moeda" },
          { rotulo: "Dias no período", valor: diasEntre(de, ate) + 1, tipo: "numero" },
        ],
        observacao: "A meta considerada é a do mês da data inicial do filtro.",
      };
    }
  }
}
