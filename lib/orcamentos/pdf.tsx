import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarKm } from "@/lib/format/veiculo";
import { FORMA_VENDA } from "@/lib/vendas/rotulos";
import { AVISO_SIMULACAO, type Simulacao } from "./simulacao";
import type { Alerta } from "./rotulos";

export type DadosPdfOrcamento = {
  numero: string;
  emitidoEm: string | null;
  validade: string | null;
  cliente: string;
  vendedor: string;
  loja: { nome: string; cidade: string; uf: string; telefones: string; whatsapp: string; assinatura: string };
  veiculo: { nome: string; ano: string; cor: string | null; km: number | null };
  precoAnunciado: number;
  desconto: number;
  valorFinal: number;
  entrada: number;
  pagamentos: { forma: string; valor: number; banco: string | null; parcelas: number | null }[];
  trocas: { nome: string; valor: number }[];
  simulacao: Simulacao | null;
  observacoes: string | null;
  alertas: Alerta[];
  alertasEm: string | null;
};

const limpar = (s: string) => s.replace(/−/g, "-").replace(/[  ]/g, " ");
const cor = { marca: "#0b5cad", tinta: "#1f2328", suave: "#57606a", linha: "#d0d7de", amarelo: "#9a6700", vermelho: "#cf222e", fundo: "#f6f8fa" };

const st = StyleSheet.create({
  pagina: { padding: 36, fontSize: 9.5, fontFamily: "Helvetica", color: cor.tinta, lineHeight: 1.4 },
  topo: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 2, borderBottomColor: cor.marca, paddingBottom: 8 },
  loja: { fontSize: 16, fontFamily: "Helvetica-Bold", color: cor.marca },
  sub: { fontSize: 8.5, color: cor.suave },
  titulo: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 14 },
  secao: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 4, color: cor.marca },
  linha: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  rotulo: { color: cor.suave },
  destaque: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  caixa: { borderWidth: 0.8, borderColor: cor.linha, borderRadius: 4, padding: 8, marginTop: 4 },
  alerta: { flexDirection: "row", gap: 6, paddingVertical: 2 },
  rodape: { position: "absolute", bottom: 22, left: 36, right: 36, fontSize: 7.5, color: cor.suave, textAlign: "center" },
});

function Linha({ r, v, forte }: { r: string; v: string; forte?: boolean }) {
  return (
    <View style={st.linha}>
      <Text style={st.rotulo}>{limpar(r)}</Text>
      <Text style={forte ? st.destaque : undefined}>{limpar(v)}</Text>
    </View>
  );
}

function Orcamento({ d }: { d: DadosPdfOrcamento }) {
  return (
    <Document title={`Orçamento ${d.numero} — ${d.loja.nome}`} author={d.loja.nome} language="pt-BR">
      <Page size="A4" style={st.pagina}>
        <View style={st.topo}>
          <View>
            <Text style={st.loja}>{d.loja.nome}</Text>
            <Text style={st.sub}>{limpar(d.loja.assinatura)}</Text>
          </View>
          <View>
            <Text style={[st.sub, { textAlign: "right" }]}>{d.loja.cidade}/{d.loja.uf}</Text>
            <Text style={[st.sub, { textAlign: "right" }]}>{d.loja.telefones}</Text>
          </View>
        </View>

        <Text style={st.titulo}>Orçamento {d.numero}</Text>
        <Text style={st.sub}>
          Para {d.cliente} · vendedor {d.vendedor}{d.emitidoEm ? ` · emitido em ${formatarData(d.emitidoEm)}` : ""}{d.validade ? ` · válido até ${formatarData(d.validade)}` : ""}
        </Text>

        <Text style={st.secao}>Veículo</Text>
        <Text style={{ fontFamily: "Helvetica-Bold" }}>{limpar(`${d.veiculo.nome} ${d.veiculo.ano}`)}</Text>
        <Text style={st.sub}>{[d.veiculo.cor, d.veiculo.km !== null ? formatarKm(d.veiculo.km) : null].filter(Boolean).join(" · ")}</Text>

        <Text style={st.secao}>Valores</Text>
        <View style={st.caixa}>
          <Linha r="Preço anunciado" v={formatarMoeda(d.precoAnunciado)} />
          {d.desconto > 0 && <Linha r="Desconto" v={`- ${formatarMoeda(d.desconto)}`} />}
          <Linha r="Valor do orçamento" v={formatarMoeda(d.valorFinal)} forte />
          {d.entrada > 0 && <Linha r="Entrada" v={formatarMoeda(d.entrada)} />}
          {d.pagamentos.map((p, i) => (
            <Linha key={i} r={`${FORMA_VENDA[p.forma as keyof typeof FORMA_VENDA] ?? p.forma}${p.banco ? ` (${p.banco}${p.parcelas ? `, ${p.parcelas}x` : ""})` : ""}`} v={formatarMoeda(p.valor)} />
          ))}
          {d.trocas.map((t, i) => <Linha key={`t${i}`} r={`Carro na troca: ${t.nome}`} v={formatarMoeda(t.valor)} />)}
        </View>

        {d.simulacao && (
          <>
            <Text style={st.secao}>Simulação de financiamento</Text>
            <View style={st.caixa}>
              <Linha r="Valor financiado" v={formatarMoeda(d.simulacao.valor_financiado)} />
              <Linha r={`${d.simulacao.prazo} parcelas (${String(d.simulacao.taxa_mensal).replace(".", ",")}% a.m.)`} v={formatarMoeda(d.simulacao.parcela)} forte />
              <Text style={[st.sub, { marginTop: 4 }]}>{AVISO_SIMULACAO}</Text>
            </View>
          </>
        )}

        <Text style={st.secao}>Condições do veículo</Text>
        <View style={st.caixa}>
          {d.alertas.length === 0 && <Text>Nenhum alerta no cadastro nem na consulta da placa.</Text>}
          {d.alertas.map((a, i) => (
            <View key={i} style={st.alerta}>
              <Text style={{ color: a.nivel === "vermelho" ? cor.vermelho : a.nivel === "amarelo" ? cor.amarelo : a.nivel === "info" ? "#1a7f37" : cor.suave, fontFamily: "Helvetica-Bold" }}>
                {a.nivel === "vermelho" ? "IMPEDITIVO" : a.nivel === "amarelo" ? "ATENÇÃO" : a.nivel === "info" ? "CONSULTA" : "PENDENTE"}
              </Text>
              <Text style={{ flex: 1 }}>{limpar(a.descricao)}{a.fonte && a.nivel !== "info" ? ` (${a.fonte}${a.data ? `, ${formatarData(a.data)}` : ""})` : ""}</Text>
            </View>
          ))}
          <Text style={[st.sub, { marginTop: 4 }]}>
            Alertas registrados em {d.alertasEm ? formatarDataHora(d.alertasEm) : "—"}. A consulta reflete a base do provedor naquele momento e pode estar incompleta ou desatualizada; recomendamos laudo cautelar independente.
          </Text>
        </View>

        {d.observacoes && (
          <>
            <Text style={st.secao}>Observações</Text>
            <Text>{limpar(d.observacoes)}</Text>
          </>
        )}

        <Text style={st.rodape} fixed>
          {d.loja.nome} · WhatsApp {d.loja.whatsapp.replace(/^55(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3")} · Orçamento sujeito à disponibilidade do veículo até a validade.
        </Text>
      </Page>
    </Document>
  );
}

export function gerarPdfOrcamento(d: DadosPdfOrcamento): Promise<Buffer> {
  return renderToBuffer(<Orcamento d={d} />);
}
