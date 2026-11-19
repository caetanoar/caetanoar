import { XMLParser } from "fast-xml-parser";

export type ItemNFe = {
  numero: number;
  codigo: string | null;
  descricao: string;
  ncm: string | null;
  cfop: string | null;
  unidade: string | null;
  quantidade: number | null;
  valorUnitario: number | null;
  valorTotal: number | null;
  veiculo: {
    chassi: string | null;
    cor: string | null;
    anoModelo: number | null;
    anoFabricacao: number | null;
    combustivel: string | null;
    motor: string | null;
    renavam: string | null;
    placa: string | null;
  } | null;
};

export type NFeLida = {
  chave: string;
  numero: string;
  serie: string;
  modelo: string;
  dataEmissao: string | null;
  naturezaOperacao: string | null;
  tipoNF: "entrada" | "saida";
  emitente: { documento: string | null; nome: string; fantasia: string | null; ie: string | null; cidade: string | null; uf: string | null };
  destinatario: { documento: string | null; nome: string | null };
  itens: ItemNFe[];
  valorTotal: number;
  valorProdutos: number | null;
  valorICMS: number | null;
  protocolo: string | null;
  situacao: string | null;
  autorizada: boolean;
  informacoesComplementares: string | null;
};

const COMBUSTIVEL_VEICPROD: Record<string, string> = {
  "01": "etanol", "02": "gasolina", "03": "diesel", "16": "flex", "17": "flex", "18": "flex",
  "04": "gnv", "05": "gnv", "15": "gnv", "13": "hibrido", "14": "hibrido", "11": "eletrico",
};

function num(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function txt(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}
function lista<T>(v: T | T[] | undefined): T[] {
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}

/** Lê o XML de uma NF-e (modelo 55, layout 4.00; aceita com ou sem nfeProc). */
export function lerNFe(xml: string): NFeLida {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    removeNSPrefix: true,
    parseTagValue: false,
    trimValues: true,
  });
  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml);
  } catch {
    throw new Error("Arquivo não é um XML válido.");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raiz: any = (doc as any).nfeProc ?? doc;
  const nfe = raiz?.NFe;
  const inf = nfe?.infNFe;
  if (!inf) throw new Error("O XML não parece ser de uma NF-e (infNFe não encontrado).");

  const chave = String(inf["@Id"] ?? "").replace(/^NFe/, "");
  if (!/^\d{44}$/.test(chave)) throw new Error("Chave de acesso inválida no XML.");

  const ide = inf.ide ?? {};
  const emit = inf.emit ?? {};
  const dest = inf.dest ?? {};
  const tot = inf.total?.ICMSTot ?? {};
  const prot = raiz?.protNFe?.infProt;
  const infCpl = txt(inf.infAdic?.infCpl);
  const renavamCpl = infCpl?.match(/RENAVAM[:\s]*(\d{9,11})/i)?.[1] ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itens: ItemNFe[] = lista(inf.det).map((d: Record<string, any>, i: number) => {
    const p = d.prod ?? {};
    const vp = p.veicProd;
    const descricao = txt(p.xProd) ?? "Item";
    const placa = descricao.match(/PLACA[:\s]*([A-Z]{3}-?\d[A-Z0-9]\d{2})/i)?.[1]?.replace("-", "").toUpperCase() ?? null;
    return {
      numero: num(d["@nItem"]) ?? i + 1,
      codigo: txt(p.cProd),
      descricao,
      ncm: txt(p.NCM),
      cfop: txt(p.CFOP),
      unidade: txt(p.uCom),
      quantidade: num(p.qCom),
      valorUnitario: num(p.vUnCom),
      valorTotal: num(p.vProd),
      veiculo: vp
        ? {
            chassi: txt(vp.chassi)?.toUpperCase() ?? null,
            cor: txt(vp.xCor),
            anoModelo: num(vp.anoMod),
            anoFabricacao: num(vp.anoFab),
            combustivel: COMBUSTIVEL_VEICPROD[txt(vp.tpComb) ?? ""] ?? null,
            motor: txt(vp.nMotor),
            renavam: renavamCpl,
            placa,
          }
        : null,
    };
  });

  return {
    chave,
    numero: String(ide.nNF ?? ""),
    serie: String(ide.serie ?? ""),
    modelo: String(ide.mod ?? "55"),
    dataEmissao: txt(ide.dhEmi ?? ide.dEmi),
    naturezaOperacao: txt(ide.natOp),
    tipoNF: String(ide.tpNF) === "0" ? "entrada" : "saida",
    emitente: {
      documento: txt(emit.CNPJ ?? emit.CPF),
      nome: txt(emit.xNome) ?? "Emitente",
      fantasia: txt(emit.xFant),
      ie: txt(emit.IE),
      cidade: txt(emit.enderEmit?.xMun),
      uf: txt(emit.enderEmit?.UF),
    },
    destinatario: { documento: txt(dest.CNPJ ?? dest.CPF), nome: txt(dest.xNome) },
    itens,
    valorTotal: num(tot.vNF) ?? itens.reduce((s, i) => s + (i.valorTotal ?? 0), 0),
    valorProdutos: num(tot.vProd),
    valorICMS: num(tot.vICMS),
    protocolo: txt(prot?.nProt),
    situacao: txt(prot?.xMotivo),
    autorizada: String(prot?.cStat ?? "") === "100",
    informacoesComplementares: infCpl,
  };
}

/** Tenta separar marca e modelo da descrição do produto ("CHEVROLET ONIX 1.0 TURBO LT ..."). */
export function marcaModeloDaDescricao(descricao: string): { marca: string; modelo: string; versao: string | null } {
  const MARCAS = ["CHEVROLET", "VOLKSWAGEN", "VW", "FIAT", "FORD", "HYUNDAI", "TOYOTA", "HONDA", "RENAULT", "NISSAN", "JEEP", "PEUGEOT", "CITROEN", "KIA", "MITSUBISHI", "CAOA CHERY", "CHERY", "BYD", "GM"];
  const limpa = descricao.toUpperCase().replace(/\s+/g, " ").replace(/\bPLACA\b.*$/, "").trim();
  const marcaEncontrada = MARCAS.find((m) => limpa.startsWith(`${m} `)) ?? limpa.split(" ")[0];
  const resto = limpa.slice(marcaEncontrada.length).trim().replace(/\b(19|20)\d{2}\/(19|20)\d{2}\b.*$/, "").trim();
  const [modelo, ...versao] = resto.split(" ");
  const titulo = (s: string) => s.toLowerCase().replace(/(^|\s|-)\S/g, (c) => c.toUpperCase());
  const marca = marcaEncontrada === "VW" ? "Volkswagen" : marcaEncontrada === "GM" ? "Chevrolet" : titulo(marcaEncontrada);
  return { marca, modelo: titulo(modelo ?? ""), versao: versao.length ? versao.join(" ") : null };
}
