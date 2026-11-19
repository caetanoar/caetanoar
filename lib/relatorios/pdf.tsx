import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Relatorio, Coluna } from "./definicoes";
import { formatarCelula, type Periodo } from "./formato";
import { formatarData, formatarDataHora } from "@/lib/format/data";

// Helvetica (embutida no PDF) cobre os acentos do português, mas não o sinal "−" (U+2212).
const limpar = (s: string) => s.replace(/−/g, "-").replace(/ | /g, " ");

const cor = { tinta: "#1f2328", suave: "#57606a", linha: "#d0d7de", fundo: "#f6f8fa", marca: "#0b5cad" };

const st = StyleSheet.create({
  pagina: { paddingTop: 28, paddingBottom: 36, paddingHorizontal: 28, fontSize: 7.5, fontFamily: "Helvetica", color: cor.tinta },
  topo: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.5, borderBottomColor: cor.marca, paddingBottom: 6, marginBottom: 10 },
  loja: { fontSize: 9, fontFamily: "Helvetica-Bold", color: cor.marca },
  titulo: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 2 },
  meta: { fontSize: 7.5, color: cor.suave, textAlign: "right" },
  resumo: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10, borderWidth: 0.5, borderColor: cor.linha, borderRadius: 3 },
  kpi: { width: "25%", padding: 6, borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: cor.linha },
  kpiRotulo: { fontSize: 6.5, color: cor.suave, marginBottom: 2 },
  kpiValor: { fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  cab: { flexDirection: "row", backgroundColor: cor.fundo, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: cor.linha },
  linha: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: cor.linha },
  cel: { paddingVertical: 3, paddingHorizontal: 3 },
  celCab: { paddingVertical: 4, paddingHorizontal: 3, fontFamily: "Helvetica-Bold", fontSize: 6.8, color: cor.suave },
  obs: { marginTop: 8, fontSize: 7, color: cor.suave },
  vazio: { padding: 16, textAlign: "center", color: cor.suave },
  rodape: { position: "absolute", bottom: 16, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between", fontSize: 6.5, color: cor.suave },
});

/** Largura relativa por tipo de coluna (texto ocupa mais). */
function peso(c: Coluna): number {
  if (c.chave === "chave") return 3.2;
  if (c.tipo === "texto") return ["veiculo", "cliente", "pessoa", "nome", "interesse", "categoria"].includes(c.chave) ? 2.2 : 1.3;
  if (c.tipo === "moeda") return 1.25;
  if (c.tipo === "data") return 0.95;
  return 0.8;
}

function DocumentoRelatorio({ rel, periodo, geradoPor, loja }: { rel: Relatorio; periodo: Periodo; geradoPor: string; loja: string }) {
  const total = rel.colunas.reduce((s, c) => s + peso(c), 0);
  const largura = (c: Coluna) => `${((peso(c) / total) * 100).toFixed(3)}%`;
  const alinhar = (c: Coluna) => (c.tipo === "texto" ? "left" : "right") as "left" | "right";
  const agora = formatarDataHora(new Date());

  return (
    <Document title={`${rel.titulo} — ${loja}`} author={loja} creator={loja} language="pt-BR">
      <Page size="A4" orientation="landscape" style={st.pagina}>
        <View style={st.topo} fixed>
          <View>
            <Text style={st.loja}>{loja}</Text>
            <Text style={st.titulo}>{rel.titulo}</Text>
          </View>
          <View>
            <Text style={st.meta}>Período: {formatarData(periodo.de)} a {formatarData(periodo.ate)}</Text>
            <Text style={st.meta}>Gerado em {agora} por {geradoPor}</Text>
          </View>
        </View>

        {rel.resumo.length > 0 && (
          <View style={st.resumo}>
            {rel.resumo.map((r) => (
              <View key={r.rotulo} style={st.kpi}>
                <Text style={st.kpiRotulo}>{limpar(r.rotulo)}</Text>
                <Text style={st.kpiValor}>{limpar(formatarCelula(r.tipo ?? "texto", r.valor))}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={st.cab} fixed>
          {rel.colunas.map((c) => (
            <Text key={c.chave} style={[st.celCab, { width: largura(c), textAlign: alinhar(c) }]}>{limpar(c.rotulo)}</Text>
          ))}
        </View>
        {rel.linhas.length === 0 ? (
          <Text style={st.vazio}>Nenhum registro no período.</Text>
        ) : (
          rel.linhas.map((l, i) => (
            <View key={i} style={st.linha} wrap={false}>
              {rel.colunas.map((c) => (
                <Text key={c.chave} style={[st.cel, { width: largura(c), textAlign: alinhar(c) }]}>{limpar(formatarCelula(c.tipo, l[c.chave]))}</Text>
              ))}
            </View>
          ))
        )}

        {rel.observacao && <Text style={st.obs}>{limpar(rel.observacao)}</Text>}

        <View style={st.rodape} fixed>
          <Text>{loja} · documento interno</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function gerarPDF(rel: Relatorio, periodo: Periodo, geradoPor: string, loja: string): Promise<Buffer> {
  return renderToBuffer(<DocumentoRelatorio rel={rel} periodo={periodo} geradoPor={geradoPor} loja={loja} />);
}
