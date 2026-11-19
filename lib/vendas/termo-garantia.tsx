import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatarData } from "@/lib/format/data";

export type DadosTermo = {
  loja: { nome: string; cidade: string; uf: string; telefones: string };
  cliente: string;
  veiculo: { descricao: string; ano: string; cor: string | null; placa: string | null; chassi: string | null; km: number | null };
  venda: { numero: string; data: string };
  garantia: { inicio: string; fim: string; dias: number; cobertura: string };
};

const limpar = (s: string) => s.replace(/−/g, "-").replace(/[  ]/g, " ");

const st = StyleSheet.create({
  pagina: { padding: 44, fontSize: 10, fontFamily: "Helvetica", color: "#1f2328", lineHeight: 1.45 },
  loja: { fontSize: 13, fontFamily: "Helvetica-Bold", color: "#0b5cad" },
  sub: { fontSize: 9, color: "#57606a" },
  titulo: { fontSize: 15, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 22, marginBottom: 16 },
  secao: { fontSize: 10.5, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 4 },
  linha: { flexDirection: "row", marginBottom: 2 },
  rotulo: { width: 120, color: "#57606a" },
  valor: { flex: 1 },
  paragrafo: { marginBottom: 6, textAlign: "justify" },
  assinaturas: { flexDirection: "row", justifyContent: "space-between", marginTop: 56 },
  assinatura: { width: "45%", borderTopWidth: 0.8, borderTopColor: "#1f2328", paddingTop: 4, textAlign: "center", fontSize: 9 },
  rodape: { position: "absolute", bottom: 24, left: 44, right: 44, fontSize: 7.5, color: "#57606a", textAlign: "center" },
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

function Termo({ d }: { d: DadosTermo }) {
  const paragrafos = d.garantia.cobertura.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <Document title={`Termo de garantia — venda ${d.venda.numero}`} author={d.loja.nome} language="pt-BR">
      <Page size="A4" style={st.pagina}>
        <Text style={st.loja}>{d.loja.nome}</Text>
        <Text style={st.sub}>{d.loja.cidade}/{d.loja.uf} · {d.loja.telefones}</Text>
        <Text style={st.titulo}>TERMO DE GARANTIA</Text>

        <Text style={st.secao}>Comprador</Text>
        <Linha rotulo="Nome" valor={d.cliente} />

        <Text style={st.secao}>Veículo</Text>
        <Linha rotulo="Veículo" valor={`${d.veiculo.descricao} ${d.veiculo.ano}`.trim()} />
        <Linha rotulo="Cor" valor={d.veiculo.cor} />
        <Linha rotulo="Placa" valor={d.veiculo.placa} />
        <Linha rotulo="Chassi" valor={d.veiculo.chassi} />
        <Linha rotulo="Quilometragem" valor={d.veiculo.km !== null ? `${d.veiculo.km.toLocaleString("pt-BR")} km na entrega` : null} />

        <Text style={st.secao}>Venda e prazo</Text>
        <Linha rotulo="Venda" valor={`${d.venda.numero}, em ${formatarData(d.venda.data)}`} />
        <Linha rotulo="Garantia" valor={`${d.garantia.dias} dias: de ${formatarData(d.garantia.inicio)} a ${formatarData(d.garantia.fim)}`} />

        <Text style={st.secao}>Cobertura e condições</Text>
        {paragrafos.map((p, i) => <Text key={i} style={st.paragrafo}>{limpar(p)}</Text>)}

        <Text style={[st.paragrafo, { marginTop: 10 }]}>
          Declaro que recebi o veículo descrito acima, que conheço as condições desta garantia e que fui informado(a) sobre o estado do veículo no ato da compra.
        </Text>
        <Text style={{ marginTop: 6 }}>{d.loja.cidade}, {formatarData(d.venda.data)}.</Text>

        <View style={st.assinaturas}>
          <Text style={st.assinatura}>{d.loja.nome}</Text>
          <Text style={st.assinatura}>{d.cliente}</Text>
        </View>

        <Text style={st.rodape} fixed>Este termo não exclui os direitos do comprador previstos no Código de Defesa do Consumidor. Duas vias de igual teor.</Text>
      </Page>
    </Document>
  );
}

export function gerarTermoGarantia(d: DadosTermo): Promise<Buffer> {
  return renderToBuffer(<Termo d={d} />);
}
