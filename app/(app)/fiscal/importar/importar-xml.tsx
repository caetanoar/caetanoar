"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileUp, Loader2, CheckCircle2, AlertTriangle, Car } from "lucide-react";
import { previsualizarXml, importarXml, type Previa } from "../acoes";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alerta } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { ListaDados } from "@/components/app/lista-dados";
import { InputData } from "@/components/form/inputs";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarData } from "@/lib/format/data";
import { formatarDocumento } from "@/lib/format/documentos";
import { formatarChave } from "@/lib/fiscal/rotulos";
import { TIPOS_FORNECEDOR } from "@/lib/cadastros/esquemas";

export function ImportarXml({ categorias }: { categorias: { id: string; nome: string }[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [xml, setXml] = useState<string | null>(null);
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, iniciarLeitura] = useTransition();
  const [importando, iniciarImportacao] = useTransition();
  const [criarFornecedor, setCriarFornecedor] = useState(true);
  const [tipoFornecedor, setTipoFornecedor] = useState<keyof typeof TIPOS_FORNECEDOR>("locadora");
  const [veiculo, setVeiculo] = useState<"nenhum" | "vincular" | "criar">("nenhum");
  const [lancar, setLancar] = useState(false);
  const [categoriaId, setCategoriaId] = useState("");
  const [vencimento, setVencimento] = useState("");

  function ler(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    setPrevia(null);
    iniciarLeitura(async () => {
      const texto = await arquivo.text();
      setXml(texto);
      const r = await previsualizarXml(texto);
      if (!r.ok || !r.dados) {
        setErro(r.erro ?? "Não foi possível ler o XML.");
        return;
      }
      setPrevia(r.dados);
      const temVeiculo = r.dados.nota.itens.some((i) => i.veiculo);
      setVeiculo(r.dados.veiculo ? "vincular" : temVeiculo ? "criar" : "nenhum");
      setLancar(!temVeiculo);
    });
  }

  function confirmar() {
    if (!xml || !previa) return;
    iniciarImportacao(async () => {
      const r = await importarXml(xml, {
        criarFornecedor,
        tipoFornecedor,
        veiculo,
        veiculoId: previa.veiculo?.id ?? null,
        lancarContaPagar: lancar,
        categoriaId: categoriaId || null,
        vencimento: vencimento || null,
      });
      if (!r.ok) {
        toast.error(r.erro ?? "Falha ao importar.");
        return;
      }
      toast.success(r.mensagem ?? "Nota importada.");
      router.push(`/fiscal/${r.dados!.id}`);
    });
  }

  const n = previa?.nota;
  const temVeiculo = n?.itens.some((i) => i.veiculo) ?? false;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <FileUp className="size-10 text-primary" />
          <p className="text-sm text-muted-foreground">Escolha o arquivo XML da NF-e (recebido do fornecedor ou baixado do portal da SEFAZ).</p>
          <input ref={input} type="file" accept=".xml,text/xml,application/xml" className="hidden" onChange={(e) => ler(e.target.files?.[0])} aria-label="Arquivo XML" />
          <Button type="button" onClick={() => input.current?.click()} disabled={lendo}>
            {lendo ? <Loader2 className="animate-spin" /> : <FileUp />} Escolher XML
          </Button>
        </CardContent>
      </Card>

      {erro && <Alerta variante="erro">{erro}</Alerta>}

      {n && previa && (
        <>
          {previa.jaImportada && <Alerta variante="aviso" titulo="Nota já importada">Esta chave de acesso já está no sistema.</Alerta>}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>NF-e {n.numero}/{n.serie}</CardTitle>
              <span className="flex gap-1.5">
                <Badge variant={previa.direcao === "entrada" ? "info" : "secondary"}>{previa.direcao === "entrada" ? "Entrada" : "Saída"}</Badge>
                {n.autorizada ? <Badge variant="success"><CheckCircle2 /> Autorizada</Badge> : <Badge variant="warning">Sem protocolo</Badge>}
              </span>
            </CardHeader>
            <CardContent>
              <ListaDados
                itens={[
                  { rotulo: "Emitente", valor: `${n.emitente.nome}${n.emitente.documento ? ` · ${formatarDocumento(n.emitente.documento)}` : ""}`, largo: true },
                  { rotulo: "Destinatário", valor: n.destinatario.nome, largo: true },
                  { rotulo: "Emissão", valor: formatarData(n.dataEmissao) },
                  { rotulo: "Valor total", valor: <strong className="numero">{formatarMoeda(n.valorTotal)}</strong> },
                  { rotulo: "Natureza", valor: n.naturezaOperacao },
                  { rotulo: "CFOP", valor: n.itens[0]?.cfop },
                  { rotulo: "Chave de acesso", valor: <span className="font-mono text-xs">{formatarChave(n.chave)}</span>, largo: true },
                ]}
              />
              <ul className="mt-4 flex flex-col gap-2">
                {n.itens.map((i) => (
                  <li key={i.numero} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{i.descricao}</p>
                    <p className="text-xs text-muted-foreground">NCM {i.ncm ?? "—"} · CFOP {i.cfop ?? "—"} · {formatarMoeda(i.valorTotal)}</p>
                    {i.veiculo && (
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <Car className="size-3.5" /> Chassi {i.veiculo.chassi ?? "—"} · {i.veiculo.anoFabricacao}/{i.veiculo.anoModelo} · {i.veiculo.cor}
                        {i.veiculo.placa && ` · placa ${i.veiculo.placa}`}{i.veiculo.renavam && ` · RENAVAM ${i.veiculo.renavam}`}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {!previa.jaImportada && (
            <Card>
              <CardHeader><CardTitle>O que fazer ao importar</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">Fornecedor</p>
                  {previa.fornecedor ? (
                    <p className="flex items-center gap-1.5 text-sm"><CheckCircle2 className="size-4 text-success" /> Vinculada a {previa.fornecedor.nome} (já cadastrado)</p>
                  ) : previa.direcao === "entrada" ? (
                    <>
                      <Label className="font-normal"><Checkbox checked={criarFornecedor} onCheckedChange={(c) => setCriarFornecedor(c === true)} /> Cadastrar o emitente como fornecedor</Label>
                      {criarFornecedor && (
                        <Select value={tipoFornecedor} onChange={(e) => setTipoFornecedor(e.target.value as keyof typeof TIPOS_FORNECEDOR)} aria-label="Tipo de fornecedor">
                          {Object.entries(TIPOS_FORNECEDOR).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
                        </Select>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nota de saída da própria loja.</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">Veículo</p>
                  <Select value={veiculo} onChange={(e) => setVeiculo(e.target.value as typeof veiculo)} aria-label="Veículo da nota">
                    <option value="nenhum">Não vincular a veículo</option>
                    {previa.veiculo && <option value="vincular">Vincular a {previa.veiculo.nome} (mesmo chassi)</option>}
                    {temVeiculo && !previa.veiculo && previa.direcao === "entrada" && <option value="criar">Cadastrar o carro no estoque (próprio, em preparação)</option>}
                  </Select>
                  {veiculo === "criar" && <p className="text-xs text-muted-foreground">O valor da nota vira o custo de compra e gera a conta a pagar ao fornecedor.</p>}
                </div>
                {previa.direcao === "entrada" && veiculo !== "criar" && (
                  <div className="flex flex-col gap-2">
                    <Label className="font-normal"><Checkbox checked={lancar} onCheckedChange={(c) => setLancar(c === true)} /> Lançar conta a pagar no financeiro</Label>
                    {lancar && (
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} aria-label="Categoria da despesa">
                          <option value="">Categoria…</option>
                          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </Select>
                        <InputData aria-label="Vencimento" placeholder="Vencimento" onValorChange={setVencimento} />
                      </div>
                    )}
                  </div>
                )}
                {previa.direcao === "entrada" && !n.autorizada && (
                  <Alerta variante="aviso"><span className="flex items-center gap-1.5"><AlertTriangle className="size-4" /> O XML não traz o protocolo de autorização. Confira a nota no portal da SEFAZ.</span></Alerta>
                )}
                <Button type="button" size="lg" onClick={confirmar} disabled={importando}>
                  {importando && <Loader2 className="animate-spin" />} Importar nota
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
