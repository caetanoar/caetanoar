"use client";

import { Loader2 } from "lucide-react";
import { salvarConfigFiscal } from "@/app/(app)/fiscal/acoes";
import { useAcao } from "@/components/form/use-acao";
import { Campo } from "@/components/form/campo";
import { InputDocumento } from "@/components/form/inputs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alerta } from "@/components/ui/misc";
import { REGIME } from "@/lib/fiscal/rotulos";
import type { Database } from "@/lib/supabase/database.types";

type Config = Database["public"]["Tables"]["configuracoes_fiscais"]["Row"];

export function FormConfigFiscal({ config }: { config: Config }) {
  const [estado, despachar, pendente] = useAcao(salvarConfigFiscal);
  const e = estado.erros ?? {};
  const v = (k: keyof Config) => (config[k] === null || config[k] === undefined ? "" : String(config[k]));
  return (
    <form onSubmit={despachar} className="flex flex-col gap-4">
      {estado.erro && <Alerta variante="erro">{estado.erro}</Alerta>}
      <Card>
        <CardHeader><CardTitle>Empresa emitente</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo id="cnpj" rotulo="CNPJ" erro={e.cnpj}><InputDocumento name="cnpj" defaultValue={v("cnpj")} placeholder="00.000.000/0000-00" /></Campo>
          <Campo id="inscricao_estadual" rotulo="Inscrição estadual" erro={e.inscricao_estadual}><Input name="inscricao_estadual" defaultValue={v("inscricao_estadual")} /></Campo>
          <Campo id="razao_social" rotulo="Razão social" className="sm:col-span-2"><Input name="razao_social" defaultValue={v("razao_social")} /></Campo>
          <Campo id="nome_fantasia" rotulo="Nome fantasia"><Input name="nome_fantasia" defaultValue={v("nome_fantasia") || "Caetano Auto"} /></Campo>
          <Campo id="inscricao_municipal" rotulo="Inscrição municipal (NFS-e)"><Input name="inscricao_municipal" defaultValue={v("inscricao_municipal")} /></Campo>
          <Campo id="regime_tributario" rotulo="Regime tributário" erro={e.regime_tributario}>
            <Select name="regime_tributario" defaultValue={v("regime_tributario")}>
              <option value="">Definir com o contador</option>
              {Object.entries(REGIME).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
            </Select>
          </Campo>
          <Campo id="ambiente" rotulo="Ambiente da SEFAZ">
            <Select name="ambiente" defaultValue={v("ambiente")}>
              <option value="homologacao">Homologação (testes)</option>
              <option value="producao">Produção</option>
            </Select>
          </Campo>
          <Campo id="telefone" rotulo="Telefone"><Input name="telefone" defaultValue={v("telefone")} /></Campo>
          <Campo id="email" rotulo="E-mail fiscal"><Input name="email" type="email" defaultValue={v("email")} /></Campo>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Endereço</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Campo id="logradouro" rotulo="Logradouro" className="sm:col-span-2"><Input name="logradouro" defaultValue={v("logradouro")} /></Campo>
          <Campo id="numero" rotulo="Número"><Input name="numero" defaultValue={v("numero")} /></Campo>
          <Campo id="complemento" rotulo="Complemento"><Input name="complemento" defaultValue={v("complemento")} /></Campo>
          <Campo id="bairro" rotulo="Bairro"><Input name="bairro" defaultValue={v("bairro")} /></Campo>
          <Campo id="cep" rotulo="CEP" erro={e.cep}><Input name="cep" inputMode="numeric" defaultValue={v("cep")} /></Campo>
          <Campo id="municipio" rotulo="Município"><Input name="municipio" defaultValue={v("municipio")} /></Campo>
          <Campo id="codigo_municipio" rotulo="Código IBGE" erro={e.codigo_municipio}><Input name="codigo_municipio" inputMode="numeric" defaultValue={v("codigo_municipio")} /></Campo>
          <Campo id="uf" rotulo="UF"><Input name="uf" maxLength={2} defaultValue={v("uf")} /></Campo>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Padrões da NF-e (com o contador)</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo id="natureza_venda" rotulo="Natureza da operação (venda)" className="sm:col-span-2"><Input name="natureza_venda" defaultValue={v("natureza_venda")} /></Campo>
          <Campo id="serie_nfe" rotulo="Série da NF-e"><Input name="serie_nfe" type="number" defaultValue={v("serie_nfe")} /></Campo>
          <Campo id="ncm_veiculos" rotulo="NCM padrão de veículos" erro={e.ncm_veiculos} dica="Ex.: 87032100 (até 1.000 cm³) — confirme"><Input name="ncm_veiculos" inputMode="numeric" defaultValue={v("ncm_veiculos")} /></Campo>
          <Campo id="cfop_venda_proprio" rotulo="CFOP venda de carro próprio (MG)"><Input name="cfop_venda_proprio" inputMode="numeric" maxLength={4} defaultValue={v("cfop_venda_proprio")} /></Campo>
          <Campo id="cfop_venda_proprio_fora_uf" rotulo="CFOP venda de carro próprio (outro estado)"><Input name="cfop_venda_proprio_fora_uf" inputMode="numeric" maxLength={4} defaultValue={v("cfop_venda_proprio_fora_uf")} /></Campo>
          <Campo id="cfop_venda_consignado" rotulo="CFOP venda de consignado"><Input name="cfop_venda_consignado" inputMode="numeric" maxLength={4} defaultValue={v("cfop_venda_consignado")} /></Campo>
          <Campo id="cfop_entrada_compra" rotulo="CFOP entrada por compra"><Input name="cfop_entrada_compra" inputMode="numeric" maxLength={4} defaultValue={v("cfop_entrada_compra")} /></Campo>
          <Campo id="cfop_entrada_consignacao" rotulo="CFOP entrada em consignação"><Input name="cfop_entrada_consignacao" inputMode="numeric" maxLength={4} defaultValue={v("cfop_entrada_consignacao")} /></Campo>
          <Campo id="cfop_devolucao_consignacao" rotulo="CFOP devolução ao consignante"><Input name="cfop_devolucao_consignacao" inputMode="numeric" maxLength={4} defaultValue={v("cfop_devolucao_consignacao")} /></Campo>
          <Campo id="csosn_cst_padrao" rotulo="CSOSN / CST padrão"><Input name="csosn_cst_padrao" defaultValue={v("csosn_cst_padrao")} /></Campo>
          <Campo id="informacoes_complementares" rotulo="Informações complementares padrão" className="sm:col-span-2"><Textarea name="informacoes_complementares" rows={3} defaultValue={v("informacoes_complementares")} /></Campo>
        </CardContent>
      </Card>
      <Button type="submit" size="lg" disabled={pendente} className="sm:self-end">{pendente && <Loader2 className="animate-spin" />} Salvar</Button>
    </form>
  );
}
