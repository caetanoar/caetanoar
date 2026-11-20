/** Contrato comum dos provedores de consulta veicular (troca por variável de ambiente). */

export type EstadoVerificacao = "encontrado" | "nada_encontrado" | "nao_verificado";

export const VERIFICACOES = {
  roubo_furto: "Roubo ou furto",
  restricoes: "Restrições judiciais ou administrativas",
  gravame: "Alienação / gravame",
  leilao: "Passagem por leilão",
  sinistro: "Sinistro ou histórico de dano",
  ipva: "Débitos de IPVA",
  multas: "Multas",
  licenciamento: "Licenciamento",
  recall: "Recall",
} as const;

export type ChaveVerificacao = keyof typeof VERIFICACOES;

export type Verificacao = { estado: EstadoVerificacao; detalhe?: string | null; valor?: number | null };

export type DadosVeiculoConsulta = {
  marca: string | null;
  modelo: string | null;
  versao: string | null;
  ano_fabricacao: number | null;
  ano_modelo: number | null;
  cor: string | null;
  combustivel: string | null;
  municipio: string | null;
  uf: string | null;
  /** Como o provedor entregar (muitas vezes parcial, com asteriscos). */
  chassi: string | null;
  codigo_fipe: string | null;
  valor_fipe: number | null;
  fipe_referencia: string | null;
};

export type ResultadoConsulta = {
  status: "encontrado" | "nao_encontrado";
  dados: DadosVeiculoConsulta;
  verificacoes: Record<ChaveVerificacao, Verificacao>;
  /** Resposta original do provedor (vai para a tabela restrita, sem dados do proprietário). */
  bruto: unknown;
  /** Custo informado pelo provedor, quando ele informa. */
  custo?: number | null;
};

export interface ProvedorConsultaVeicular {
  nome: string;
  simulado: boolean;
  configurado: boolean;
  consultar(placa: string): Promise<ResultadoConsulta>;
}

export const DADOS_VAZIOS: DadosVeiculoConsulta = {
  marca: null, modelo: null, versao: null, ano_fabricacao: null, ano_modelo: null, cor: null, combustivel: null,
  municipio: null, uf: null, chassi: null, codigo_fipe: null, valor_fipe: null, fipe_referencia: null,
};

export function todasNaoVerificadas(): Record<ChaveVerificacao, Verificacao> {
  return Object.fromEntries(Object.keys(VERIFICACOES).map((k) => [k, { estado: "nao_verificado" }])) as Record<ChaveVerificacao, Verificacao>;
}
