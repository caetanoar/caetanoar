"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle, Lock } from "lucide-react";
import { salvarCliente, verificarTelefone } from "./acoes";
import { useAcao } from "@/components/form/use-acao";
import { Campo } from "@/components/form/campo";
import { InputTelefone, InputData } from "@/components/form/inputs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alerta } from "@/components/ui/misc";
import { ORIGEM_LEAD } from "@/lib/clientes/rotulos";
import { formatarCPF } from "@/lib/format/documentos";

type Valores = Record<string, string | boolean | null | undefined>;
type Opcao = { id: string; nome: string };
type Duplicado = { cliente_id: string | null; primeiro_nome: string; vendedor: string; e_meu: boolean };

export function FormCliente({
  valores = {},
  vendedores,
  parceiros,
  podeAtribuir,
  cpfMascarado,
}: {
  valores?: Valores;
  vendedores: Opcao[];
  parceiros: Opcao[];
  podeAtribuir: boolean;
  cpfMascarado?: string | null;
}) {
  const router = useRouter();
  const editando = Boolean(valores.id);
  const [origem, setOrigem] = useState(String(valores.origem ?? "loja"));
  const [duplicados, setDuplicados] = useState<Duplicado[]>([]);
  const [cpf, setCpf] = useState("");
  const [estado, despachar, pendente] = useAcao(salvarCliente, {
    onSucesso: (e) => e.dados?.id && router.push(`/clientes/${e.dados.id}`),
  });
  const e = estado.erros ?? {};
  const v = (k: string) => (valores[k] === null || valores[k] === undefined ? "" : String(valores[k]));

  async function checar(tel: string) {
    const digitos = tel.replace(/\D/g, "");
    if (editando || digitos.length < 10) {
      setDuplicados([]);
      return;
    }
    setDuplicados((await verificarTelefone(digitos)) as Duplicado[]);
  }

  return (
    <form onSubmit={despachar} className="flex flex-col gap-4">
      {editando && <input type="hidden" name="id" value={v("id")} />}
      {estado.erro && <Alerta variante="erro">{estado.erro}</Alerta>}

      <Card>
        <CardHeader><CardTitle>Contato</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="nome" rotulo="Nome" erro={e.nome} obrigatorio className="sm:col-span-2">
            <Input name="nome" defaultValue={v("nome")} autoComplete="off" />
          </Campo>
          <Campo id="whatsapp" rotulo="WhatsApp" erro={e.whatsapp}>
            <InputTelefone name="whatsapp" defaultValue={v("whatsapp")} onValorChange={checar} />
          </Campo>
          <Campo id="telefone" rotulo="Outro telefone" erro={e.telefone}>
            <InputTelefone name="telefone" defaultValue={v("telefone")} onValorChange={checar} />
          </Campo>
          {duplicados.length > 0 && (
            <Alerta variante="aviso" className="sm:col-span-2">
              <span className="flex items-start gap-1.5">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  Este telefone já está cadastrado:{" "}
                  {duplicados.map((d, i) => (
                    <span key={i}>
                      {d.cliente_id ? <Link className="font-medium text-primary underline" href={`/clientes/${d.cliente_id}`}>{d.primeiro_nome}</Link> : <strong>{d.primeiro_nome}</strong>}
                      {d.e_meu ? " (seu cliente)" : ` (com ${d.vendedor})`}
                      {i < duplicados.length - 1 ? ", " : ""}
                    </span>
                  ))}
                  . Evite cadastrar em dobro.
                </span>
              </span>
            </Alerta>
          )}
          <Campo id="email" rotulo="E-mail" erro={e.email}>
            <Input name="email" type="email" inputMode="email" defaultValue={v("email")} />
          </Campo>
          <Campo id="cidade" rotulo="Cidade" erro={e.cidade}>
            <Input name="cidade" defaultValue={v("cidade") || "Divinópolis"} />
          </Campo>
          <input type="hidden" name="uf" value={v("uf") || "MG"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Origem e atendimento</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="origem" rotulo="Origem do lead" erro={e.origem}>
            <Select name="origem" value={origem} onChange={(ev) => setOrigem(ev.target.value)}>
              {Object.entries(ORIGEM_LEAD).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
            </Select>
          </Campo>
          {origem === "indicacao" ? (
            <Campo id="parceiro_id" rotulo="Indicado por (parceiro)" erro={e.parceiro_id}>
              <Select name="parceiro_id" defaultValue={v("parceiro_id")}>
                <option value="">Sem parceiro cadastrado</option>
                {parceiros.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </Select>
            </Campo>
          ) : (
            <input type="hidden" name="parceiro_id" value="" />
          )}
          {podeAtribuir ? (
            <Campo id="vendedor_id" rotulo="Vendedor responsável" erro={e.vendedor_id}>
              <Select name="vendedor_id" defaultValue={v("vendedor_id")}>
                <option value="">Sem responsável</option>
                {vendedores.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </Select>
            </Campo>
          ) : (
            <input type="hidden" name="vendedor_id" value={v("vendedor_id")} />
          )}
          <Campo id="observacoes" rotulo="Observações" erro={e.observacoes} className="sm:col-span-2">
            <Textarea name="observacoes" defaultValue={v("observacoes")} rows={2} />
          </Campo>
          <Label className="font-normal sm:col-span-2">
            <Checkbox name="aceita_marketing" value="true" defaultChecked={valores.aceita_marketing === true} />
            Cliente aceita receber ofertas por WhatsApp/e-mail (LGPD)
          </Label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5"><Lock className="size-4" /> Dados pessoais</CardTitle>
          <CardDescription>Protegidos (LGPD): o CPF fica mascarado e cada consulta é registrada. Preencha quando for fechar negócio.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="cpf" rotulo="CPF" erro={e.cpf} dica={cpfMascarado ? `Atual: ${cpfMascarado}. Digite só se for alterar.` : undefined}>
            <Input name="cpf" inputMode="numeric" autoComplete="off" value={cpf} onChange={(ev) => setCpf(formatarCPF(ev.target.value))} placeholder={cpfMascarado ?? "000.000.000-00"} />
          </Campo>
          <Campo id="rg" rotulo="RG" erro={e.rg} dica={editando ? "Protegido. Digite só se for alterar." : undefined}>
            <Input name="rg" autoComplete="off" />
          </Campo>
          <Campo id="data_nascimento" rotulo="Data de nascimento" erro={e.data_nascimento}>
            <InputData name="data_nascimento" defaultValue={v("data_nascimento")} />
          </Campo>
          <Campo id="cep" rotulo="CEP" erro={e.cep}>
            <Input name="cep" inputMode="numeric" maxLength={9} defaultValue={v("cep")} />
          </Campo>
          <Campo id="logradouro" rotulo="Endereço" erro={e.logradouro} className="sm:col-span-2">
            <Input name="logradouro" defaultValue={v("logradouro")} />
          </Campo>
          <Campo id="numero" rotulo="Número" erro={e.numero}>
            <Input name="numero" defaultValue={v("numero")} />
          </Campo>
          <Campo id="bairro" rotulo="Bairro" erro={e.bairro}>
            <Input name="bairro" defaultValue={v("bairro")} />
          </Campo>
          <Campo id="complemento" rotulo="Complemento" erro={e.complemento}>
            <Input name="complemento" defaultValue={v("complemento")} />
          </Campo>
          <Campo id="cidade_endereco" rotulo="Cidade (endereço)" erro={e.cidade_endereco}>
            <Input name="cidade_endereco" defaultValue={v("cidade_endereco")} />
          </Campo>
          <input type="hidden" name="uf_endereco" value={v("uf_endereco")} />
        </CardContent>
      </Card>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex gap-2 rounded-xl border bg-card/95 p-2 shadow-lg backdrop-blur sm:justify-end lg:bottom-4">
        <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={pendente} className="flex-1 sm:flex-none">
          {pendente && <Loader2 className="animate-spin" />} {editando ? "Salvar" : "Cadastrar cliente"}
        </Button>
      </div>
    </form>
  );
}
