export type FipeOpcao = { codigo: string; nome: string };

export type FipeValor = {
  valor: number;
  marca: string;
  modelo: string;
  anoModelo: number;
  combustivel: string;
  codigoFipe: string;
  mesReferencia: string;
};

/** Contrato comum dos provedores da Tabela FIPE. */
export interface ProvedorFipe {
  nome: string;
  marcas(): Promise<FipeOpcao[]>;
  modelos(marca: string): Promise<FipeOpcao[]>;
  anos(marca: string, modelo: string): Promise<FipeOpcao[]>;
  valor(marca: string, modelo: string, ano: string): Promise<FipeValor>;
}
