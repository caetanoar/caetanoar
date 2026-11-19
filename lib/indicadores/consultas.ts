import "server-only";
import { criarClienteServidor } from "@/lib/supabase/server";
import { fimDoMes, inicioDoMes, hojeISO, somarDias } from "@/lib/format/data";

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Indicadores do mês para dono e gerente (lucro incluso). */
export async function resumoMes(mes: string = inicioDoMes()) {
  const supabase = await criarClienteServidor();
  const ini = inicioDoMes(mes);
  const fim = fimDoMes(mes);
  const [a0, m0] = ini.split("-").map(Number);
  const seisMesesAntes = new Date(Date.UTC(a0, m0 - 6, 1)).toISOString().slice(0, 10);

  const [{ data: vendas }, { data: metas }, { data: estoque }, { data: config }, { data: vendedores }, { data: historico }] = await Promise.all([
    supabase.from("v_vendas").select("id, vendedor_id, vendedor_nome, valor_venda, tipo_veiculo").eq("status", "fechada").gte("data_venda", ini).lte("data_venda", fim),
    supabase.from("metas").select("*").eq("mes", ini),
    supabase.from("v_veiculos_gestao").select("id, marca, modelo, placa, tipo, status, preco_anunciado, custo_total, dias_em_estoque").in("status", ["em_preparacao", "disponivel", "reservado"]),
    supabase.from("configuracoes").select("estoque_parado_dias").single(),
    supabase.rpc("listar_vendedores"),
    supabase.from("vendas").select("data_venda, valor_venda").eq("status", "fechada").gte("data_venda", seisMesesAntes).lte("data_venda", fim),
  ]);
  const ids = (vendas ?? []).map((v) => v.id!);
  const [{ data: lucros }, { data: comissoes }] = await Promise.all([
    ids.length ? supabase.from("v_lucro_vendas_calc").select("venda_id, lucro, comissao_vendedor, comissao_parceiro, comissao_loja").in("venda_id", ids) : Promise.resolve({ data: [] as { venda_id: string | null; lucro: number | null; comissao_vendedor: number | null; comissao_parceiro: number | null; comissao_loja: number | null }[] }),
    ids.length ? supabase.from("comissoes").select("valor, tipo, status").in("venda_id", ids).neq("status", "cancelada") : Promise.resolve({ data: [] as { valor: number; tipo: string; status: string }[] }),
  ]);

  const qtd = vendas?.length ?? 0;
  const faturamento = (vendas ?? []).reduce((s, v) => s + Number(v.valor_venda), 0);
  const lucro = (lucros ?? []).reduce((s, l) => s + Number(l.lucro ?? 0), 0);
  const totalComissoes = (comissoes ?? []).filter((c) => c.tipo !== "loja_consignado").reduce((s, c) => s + Number(c.valor), 0);
  const metaLoja = (metas ?? []).find((m) => m.vendedor_id === null) ?? null;
  const parado = config?.estoque_parado_dias ?? 45;
  const est = estoque ?? [];

  const lucroPorVenda = new Map((lucros ?? []).map((l) => [l.venda_id, Number(l.lucro ?? 0)]));
  const porVendedor = (vendedores ?? []).map((u) => {
    const minhas = (vendas ?? []).filter((v) => v.vendedor_id === u.id);
    const meta = (metas ?? []).find((m) => m.vendedor_id === u.id) ?? null;
    return {
      id: u.id,
      nome: u.nome,
      qtd: minhas.length,
      faturamento: minhas.reduce((s, v) => s + Number(v.valor_venda), 0),
      lucro: minhas.reduce((s, v) => s + (lucroPorVenda.get(v.id!) ?? 0), 0),
      meta,
    };
  }).filter((v) => v.qtd > 0 || v.meta);

  const [ano, mesNum] = ini.split("-").map(Number);
  const meses = Array.from({ length: 6 }, (_, k) => {
    const d = new Date(Date.UTC(ano, mesNum - 1 - (5 - k), 1));
    const chave = d.toISOString().slice(0, 7);
    const doMes = (historico ?? []).filter((h) => h.data_venda.slice(0, 7) === chave);
    return {
      rotulo: `${MESES_CURTOS[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`,
      valor: doMes.reduce((s, h) => s + Number(h.valor_venda), 0),
      detalhe: `${doMes.length} venda(s)`,
    };
  });

  return {
    ini,
    fim,
    qtd,
    faturamento,
    ticketMedio: qtd ? faturamento / qtd : 0,
    lucro,
    comissoes: totalComissoes,
    metaLoja,
    porVendedor,
    meses,
    estoque: {
      qtd: est.length,
      valorAnunciado: est.reduce((s, v) => s + Number(v.preco_anunciado ?? 0), 0),
      custoProprios: est.filter((v) => v.tipo === "proprio").reduce((s, v) => s + Number(v.custo_total ?? 0), 0),
      mediaDias: est.length ? Math.round(est.reduce((s, v) => s + Number(v.dias_em_estoque ?? 0), 0) / est.length) : 0,
      parados: est.filter((v) => Number(v.dias_em_estoque) > parado).sort((a, b) => Number(b.dias_em_estoque) - Number(a.dias_em_estoque)),
      diasParado: parado,
    },
  };
}

/** Itens de atenção para o painel do dono. */
export async function alertasGerenciais() {
  const supabase = await criarClienteServidor();
  const { data: config } = await supabase.from("configuracoes").select("alerta_contas_dias, alerta_garantia_dias").single();
  const dias = config?.alerta_contas_dias ?? 7;
  const hoje = hojeISO();
  const limite = somarDias(hoje, dias);
  const fimMes = fimDoMes(hoje);
  const [{ data: saldos }, { data: pendentes }, { data: garantias }, { data: aprovacoes }] = await Promise.all([
    supabase.from("v_saldos_contas").select("saldo_atual").eq("ativa", true),
    supabase.from("v_lancamentos").select("id, tipo, descricao, valor, data_vencimento, vencido, pessoa").eq("status", "pendente").in("tipo", ["receita", "despesa"]).order("data_vencimento"),
    supabase.from("v_garantias").select("id, veiculo_nome, cliente_nome, data_fim, dias_restantes, status, vence_em_breve").in("status", ["ativa", "acionada"]),
    supabase.from("v_vendas").select("id, numero, veiculo_nome, vendedor_nome, valor_venda").eq("status", "aguardando_aprovacao"),
  ]);
  const saldo = (saldos ?? []).reduce((s, c) => s + Number(c.saldo_atual ?? 0), 0);
  const pend = pendentes ?? [];
  const soma = (tipo: string, ate: string) => pend.filter((l) => l.tipo === tipo && l.data_vencimento! <= ate).reduce((s, l) => s + Number(l.valor), 0);
  return {
    saldo,
    entradasMes: soma("receita", fimMes),
    saidasMes: soma("despesa", fimMes),
    projetadoFimMes: saldo + soma("receita", fimMes) - soma("despesa", fimMes),
    vencendo: pend.filter((l) => l.data_vencimento! <= limite).slice(0, 12),
    vencidos: pend.filter((l) => l.vencido).length,
    diasContas: dias,
    garantiasVencendo: (garantias ?? []).filter((g) => g.status === "ativa" && g.vence_em_breve),
    garantiasAcionadas: (garantias ?? []).filter((g) => g.status === "acionada"),
    diasGarantia: config?.alerta_garantia_dias ?? 15,
    aprovacoes: aprovacoes ?? [],
  };
}
