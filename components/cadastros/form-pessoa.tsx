"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { EstadoAcao } from "@/lib/acoes";
import { useAcao } from "@/components/form/use-acao";
import { Campo } from "@/components/form/campo";
import { InputDocumento, InputTelefone } from "@/components/form/inputs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alerta } from "@/components/ui/misc";

type Valores = Record<string, string | boolean | null | undefined>;

export type ConfigFormPessoa = {
  tipos?: Record<string, string>;
  razaoSocial?: boolean;
  contato?: boolean;
  uf?: boolean;
  endereco?: boolean;
  dadosBancarios?: boolean;
  rotuloNome?: string;
};

export function FormPessoa({
  acao,
  valores = {},
  config,
  destinoAposSalvar,
}: {
  acao: (estado: EstadoAcao<{ id: string }>, fd: FormData) => Promise<EstadoAcao<{ id: string }>>;
  valores?: Valores;
  config: ConfigFormPessoa;
  destinoAposSalvar: (id: string) => string;
}) {
  const router = useRouter();
  const [estado, despachar, pendente] = useAcao(acao, {
    onSucesso: (e) => e.dados?.id && router.push(destinoAposSalvar(e.dados.id)),
  });
  const e = estado.erros ?? {};
  const v = (k: string) => (valores[k] as string | null | undefined) ?? "";

  return (
    <form onSubmit={despachar} className="flex flex-col gap-4">
      {valores.id && <input type="hidden" name="id" value={String(valores.id)} />}
      {estado.erro && <Alerta variante="erro">{estado.erro}</Alerta>}
      <Card>
        <CardHeader><CardTitle>Identificação</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {config.tipos && (
            <Campo id="tipo" rotulo="Tipo" erro={e.tipo} obrigatorio>
              <Select name="tipo" defaultValue={v("tipo")}>
                <option value="" disabled>Escolha…</option>
                {Object.entries(config.tipos).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>{rotulo}</option>
                ))}
              </Select>
            </Campo>
          )}
          <Campo id="nome" rotulo={config.rotuloNome ?? "Nome"} erro={e.nome} obrigatorio className={config.tipos ? "" : "sm:col-span-2"}>
            <Input name="nome" defaultValue={v("nome")} autoComplete="off" />
          </Campo>
          {config.razaoSocial && (
            <Campo id="razao_social" rotulo="Razão social" erro={e.razao_social}>
              <Input name="razao_social" defaultValue={v("razao_social")} />
            </Campo>
          )}
          <Campo id="documento" rotulo="CPF ou CNPJ" erro={e.documento}>
            <InputDocumento name="documento" defaultValue={v("documento")} />
          </Campo>
          {config.contato && (
            <Campo id="contato_nome" rotulo="Pessoa de contato" erro={e.contato_nome}>
              <Input name="contato_nome" defaultValue={v("contato_nome")} />
            </Campo>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Contato</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="telefone" rotulo="Telefone" erro={e.telefone}>
            <InputTelefone name="telefone" defaultValue={v("telefone")} />
          </Campo>
          <Campo id="whatsapp" rotulo="WhatsApp" erro={e.whatsapp} dica="Se for o mesmo do telefone, pode deixar em branco">
            <InputTelefone name="whatsapp" defaultValue={v("whatsapp")} />
          </Campo>
          <Campo id="email" rotulo="E-mail" erro={e.email}>
            <Input name="email" type="email" inputMode="email" defaultValue={v("email")} />
          </Campo>
          <Campo id="cidade" rotulo="Cidade" erro={e.cidade}>
            <Input name="cidade" defaultValue={v("cidade")} />
          </Campo>
          {config.uf && (
            <Campo id="uf" rotulo="UF" erro={e.uf}>
              <Input name="uf" defaultValue={v("uf")} maxLength={2} className="uppercase" />
            </Campo>
          )}
          {config.endereco && (
            <Campo id="endereco" rotulo="Endereço" erro={e.endereco} className="sm:col-span-2">
              <Input name="endereco" defaultValue={v("endereco")} />
            </Campo>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Pagamento e observações</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo id="chave_pix" rotulo="Chave Pix" erro={e.chave_pix}>
            <Input name="chave_pix" defaultValue={v("chave_pix")} autoComplete="off" />
          </Campo>
          {config.dadosBancarios && (
            <Campo id="dados_bancarios" rotulo="Dados bancários" erro={e.dados_bancarios} dica="Banco, agência e conta">
              <Input name="dados_bancarios" defaultValue={v("dados_bancarios")} autoComplete="off" />
            </Campo>
          )}
          <Campo id="observacoes" rotulo="Observações" erro={e.observacoes} className="sm:col-span-2">
            <Textarea name="observacoes" defaultValue={v("observacoes")} rows={3} />
          </Campo>
          {valores.id && (
            <Campo id="ativo" rotulo="Situação">
              <Select name="ativo" defaultValue={valores.ativo === false ? "false" : "true"}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </Select>
            </Campo>
          )}
        </CardContent>
      </Card>
      <div className="flex gap-2 sm:justify-end">
        <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" disabled={pendente} className="flex-1 sm:flex-none">
          {pendente && <Loader2 className="animate-spin" />} Salvar
        </Button>
      </div>
    </form>
  );
}
