import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarData, formatarDataHora } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/moeda";
import type { Alerta } from "@/lib/orcamentos/rotulos";

export type DadosTermoCiencia = {
  loja: { nome: string; cidade: string; uf: string; telefones: string };
  cliente: string;
  vendedor: string;
  veiculo: { descricao: string; ano: string; cor: string | null; placa: string | null; chassi: string | null; km: number | null };
  venda: { numero: string; data: string; valor: number };
  alertas: Alerta[];
  informadoEm: string;
  informadoPor: string;
  consulta: { em: string; provedor: string; simulado: boolean } | null;
  liberacao: { em: string; por: string; justificativa: string } | null;
};

const limpar = (s: string) => s.replace(/−/g, "-").replace(/[  ]/g, " ");
const COR = { marca: "#0b5cad", tinta: "#1f2328", suave: "#57606a", vermelho: "#cf222e", amarelo: "#9a6700", linha: "#d0d7de" };
const NIVEL: Record<string, { rotulo: string; cor: string }> = {
  vermelho: { rotulo: "IMPEDITIVO", cor: COR.vermelho },
  amarelo: { rotulo: "ATENÇÃO", cor: COR.amarelo },
  pendente: { rotulo: "PENDENTE", cor: COR.suave },
};

const st = StyleSheet.create({
  pagina: { padding: 42, paddingBottom: 54, fontSize: 9.5, fontFamily: "Helvetica", color: COR.tinta, lineHeight: 1.45 },
  loja: { fontSize: 13, fontFamily: "Helvetica-Bold", color: COR.marca },
  sub: { fontSize: 8.5, color: COR.suave },
  titulo: { fontSize: 14, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 18, marginBottom: 12 },
  secao: { fontSize: 10, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4 },
  linha: { flexDirection: "row", marginBottom: 2 },
  rotulo: { width: 110, color: COR.suave },
  valor: { flex: 1 },
  caixa: { borderWidth: 0.8, borderColor: COR.linha, borderRadius: 4, padding: 8 },
  alerta: { flexDirection: "row", gap: 6, paddingVertical: 2.5 },
  paragrafo: { marginBottom: 5, textAlign: "justify" },
  assinaturas: { flexDirection: "row", justifyContent: "space-between", marginTop: 44 },
  assinatura: { width: "45%", borderTopWidth: 0.8, borderTopColor: COR.tinta, paddingTop: 4, textAlign: "center", fontSize: 8.5 },
  rodape: { position: "absolute", bottom: 22, left: 42, right: 42, fontSize: 7.5, color: COR.suave, textAlign: "center" },
});

function Linha({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  if (!valor) return null;
  return (
    <View style={st.linha}>
      <Text style={st.rotulo}>{rotulo}</Text>
      <Text style={st.valor}>{limpar(valor)}</Text>
    </View>
  );
}

function Termo({ d }: { d: DadosTermoCiencia }) {
  return (
    <Document title={`Termo de Ciência — venda ${d.venda.numero}`} author={d.loja.nome} language="pt-BR">
      <Page size="A4" style={st.pagina}>
        <Text style={st.loja}>{d.loja.nome}</Text>
        <Text style={st.sub}>{d.loja.cidade}/{d.loja.uf} · {d.loja.telefones}</Text>
        <Text style={st.titulo}>TERMO DE CIÊNCIA DAS CONDIÇÕES DO VEÍCULO</Text>

        <Text style={st.secao}>Comprador</Text>
        <Linha rotulo="Nome" valor={d.cliente} />
        <Linha rotulo="CPF" valor="______________________________" />

        <Text style={st.secao}>Veículo e venda</Text>
        <Linha rotulo="Veículo" valor={`${d.veiculo.descricao} ${d.veiculo.ano}`.trim()} />
        <Linha rotulo="Cor" valor={d.veiculo.cor} />
        <Linha rotulo="Placa" valor={d.veiculo.placa} />
        <Linha rotulo="Chassi" valor={d.veiculo.chassi} />
        <Linha rotulo="Quilometragem" valor={d.veiculo.km !== null ? `${d.veiculo.km.toLocaleString("pt-BR")} km` : null} />
        <Linha rotulo="Venda" valor={`${d.venda.numero}, em ${formatarData(d.venda.data)}, ${formatarMoeda(d.venda.valor)}`} />

        <Text style={st.secao}>Condições informadas ao comprador antes da compra</Text>
        <View style={st.caixa}>
          {d.alertas.map((a, i) => (
            <View key={i} style={st.alerta} wrap={false}>
              <Text style={{ color: NIVEL[a.nivel]?.cor ?? COR.suave, fontFamily: "Helvetica-Bold", width: 70 }}>{NIVEL[a.nivel]?.rotulo ?? "ALERTA"}</Text>
              <Text style={{ flex: 1 }}>
                {limpar(a.descricao)}
                {a.fonte ? ` (${a.fonte}${a.data ? `, ${formatarData(a.data)}` : ""})` : a.origem === "cadastro" ? " (cadastro do veículo)" : ""}
              </Text>
            </View>
          ))}
          <Text style={[st.sub, { marginTop: 4 }]}>
            {d.consulta
              ? `Consulta da placa em ${formatarDataHora(d.consulta.em)} (${d.consulta.provedor}${d.consulta.simulado ? ", ambiente de teste" : ""}). `
              : "A placa não foi consultada em base externa. "}
            A consulta reflete a base do provedor naquele momento e pode estar incompleta ou desatualizada; itens que o provedor não cobre aparecem como não verificados.
          </Text>
        </View>

        {d.liberacao && (
          <>
            <Text style={st.secao}>Liberação da venda pela loja</Text>
            <Text style={st.paragrafo}>
              {limpar(`Venda liberada por ${d.liberacao.por} em ${formatarDataHora(d.liberacao.em)}. Justificativa: ${d.liberacao.justificativa}`)}
            </Text>
          </>
        )}

        <Text style={st.secao}>Declaração</Text>
        <Text style={st.paragrafo}>
          Declaro que, antes de concluir a compra, fui informado(a) pela {d.loja.nome} de todas as condições do veículo listadas acima, que li este termo e
          que compreendi seu conteúdo. Recebi a recomendação de realizar laudo cautelar independente e de conferir a documentação do veículo.
        </Text>
        <Text style={st.paragrafo}>
          Este termo registra informações prestadas ao comprador e não exclui nem limita os direitos previstos no Código de Defesa do Consumidor nem a
          garantia legal ou contratual do veículo.
        </Text>
        <Text style={[st.paragrafo, { marginTop: 8 }]}>{d.loja.cidade}/{d.loja.uf}, ______ de ________________ de ________.</Text>

        <View style={st.assinaturas} wrap={false}>
          <Text style={st.assinatura}>{limpar(d.cliente)}{"\n"}Comprador</Text>
          <Text style={st.assinatura}>{limpar(d.vendedor)}{"\n"}{d.loja.nome}</Text>
        </View>

        <Text style={st.rodape} fixed>
          {limpar(`Ciência registrada no sistema por ${d.informadoPor} em ${formatarDataHora(d.informadoEm)} · Venda ${d.venda.numero}`)}
        </Text>
      </Page>
    </Document>
  );
}

export function gerarTermoCiencia(d: DadosTermoCiencia): Promise<Buffer> {
  return renderToBuffer(<Termo d={d} />);
}
