import type { ProvedorConsultaVeicular, ResultadoConsulta, Verificacao, ChaveVerificacao } from "./tipos";
import { DADOS_VAZIOS, todasNaoVerificadas } from "./tipos";

/**
 * Provedor SIMULADO, para usar enquanto nenhum provedor real é contratado.
 * Cenários fixos pelo último dígito da placa:
 *   3 → nada encontrado (selo verde)        5 → leilão + IPVA em aberto (amarelo)
 *   7 → roubo/furto registrado (vermelho)   9 → placa não encontrada na base
 *   demais → nada encontrado, com multas "não verificado"
 * Recall sempre "não verificado" (nenhum provedor confirmou recall por API).
 */
const CARROS = [
  { marca: "Volkswagen", modelo: "Gol", versao: "1.0 MPI", wmi: "9BW", fipe: "005340-6", valor: 38500 },
  { marca: "Fiat", modelo: "Argo", versao: "Drive 1.0", wmi: "9BD", fipe: "001478-8", valor: 62300 },
  { marca: "Chevrolet", modelo: "Onix", versao: "LT 1.0", wmi: "9BG", fipe: "004472-5", valor: 58900 },
  { marca: "Hyundai", modelo: "HB20", versao: "Comfort 1.0", wmi: "9BH", fipe: "015134-3", valor: 54200 },
  { marca: "Toyota", modelo: "Corolla", versao: "XEi 2.0", wmi: "9BR", fipe: "002111-8", valor: 98700 },
  { marca: "Renault", modelo: "Kwid", versao: "Zen 1.0", wmi: "93Y", fipe: "025259-0", valor: 46800 },
];
const CORES = ["Branco", "Prata", "Preto", "Cinza", "Vermelho", "Azul"];

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function criarProvedorSimulado(): ProvedorConsultaVeicular {
  return {
    nome: "Simulado",
    simulado: true,
    configurado: true,
    async consultar(placa: string): Promise<ResultadoConsulta> {
      const ultimo = placa.slice(-1);
      if (ultimo === "9") {
        return { status: "nao_encontrado", dados: { ...DADOS_VAZIOS }, verificacoes: todasNaoVerificadas(), bruto: { placa, encontrado: false, simulado: true }, custo: 0 };
      }
      const h = hash(placa);
      const carro = CARROS[h % CARROS.length];
      const anoModelo = 2014 + (h % 10);
      const nada: Verificacao = { estado: "nada_encontrado" };
      const v: Record<ChaveVerificacao, Verificacao> = {
        roubo_furto: nada, restricoes: nada, gravame: nada, leilao: nada, sinistro: nada,
        ipva: nada, multas: ultimo === "3" ? nada : { estado: "nao_verificado" }, licenciamento: nada,
        recall: { estado: "nao_verificado" },
      };
      if (ultimo === "5") {
        v.leilao = { estado: "encontrado", detalhe: "Registro de leilão (simulado): lote 42, veículo recuperado de financiamento" };
        v.ipva = { estado: "encontrado", detalhe: "IPVA em aberto (simulado)", valor: 1240.5 };
      }
      if (ultimo === "7") {
        v.roubo_furto = { estado: "encontrado", detalhe: "Ocorrência de roubo/furto ativa (simulada)" };
      }
      const dados = {
        marca: carro.marca,
        modelo: carro.modelo,
        versao: carro.versao,
        ano_fabricacao: anoModelo - (h % 2),
        ano_modelo: anoModelo,
        cor: CORES[h % CORES.length],
        combustivel: "flex",
        municipio: "Divinópolis",
        uf: "MG",
        chassi: `${carro.wmi}********${String(h % 1000000).padStart(6, "0")}`,
        codigo_fipe: carro.fipe,
        valor_fipe: carro.valor,
        fipe_referencia: "simulado",
      };
      return {
        status: "encontrado",
        dados,
        verificacoes: v,
        bruto: { placa, simulado: true, proprietario: { nome: "Fulano de Tal", cpf: "000.000.000-00" }, veiculo: dados, verificacoes: v },
        custo: 0,
      };
    },
  };
}
