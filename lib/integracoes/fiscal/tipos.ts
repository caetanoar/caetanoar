/** Modelo de nota de saída independente do provedor fiscal. */
export type Endereco = {
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  municipio: string;
  codigoMunicipio?: string | null;
  uf: string;
  cep: string;
};

export type NotaSaida = {
  referencia: string;
  ambiente: "homologacao" | "producao";
  dataEmissao: string;
  naturezaOperacao: string;
  emitente: { cnpj: string; inscricaoEstadual: string; razaoSocial: string; nomeFantasia?: string | null; regime: string; endereco: Endereco; telefone?: string | null };
  destinatario: { nome: string; documento: string; email?: string | null; telefone?: string | null; endereco: Endereco };
  itens: {
    numero: number;
    codigo: string;
    descricao: string;
    ncm: string;
    cfop: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    csosnCst: string;
  }[];
  pagamentos: { forma: string; valor: number }[];
  valorTotal: number;
  informacoesComplementares?: string | null;
};

export type ResultadoFiscal = {
  status: "processando" | "autorizada" | "rejeitada" | "cancelada" | "erro";
  chave?: string | null;
  numero?: string | null;
  serie?: string | null;
  protocolo?: string | null;
  mensagem?: string | null;
  xmlUrl?: string | null;
  pdfUrl?: string | null;
  referenciaProvedor?: string | null;
  simulada?: boolean;
  bruto?: unknown;
};

/** Contrato que todo provedor de emissão (Focus NFe, NFE.io, …) implementa. */
export interface ProvedorFiscal {
  nome: string;
  configurado: boolean;
  emitir(nota: NotaSaida): Promise<ResultadoFiscal>;
  consultar(referencia: string): Promise<ResultadoFiscal>;
  cancelar(referencia: string, justificativa: string): Promise<ResultadoFiscal>;
}
