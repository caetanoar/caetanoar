"use client";

import { Loader2 } from "lucide-react";
import { salvarLoja } from "../acoes";
import { useAcao } from "@/components/form/use-acao";
import type { Database } from "@/lib/supabase/database.types";
import { Campo } from "@/components/form/campo";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alerta } from "@/components/ui/misc";

type Config = Database["public"]["Tables"]["configuracoes"]["Row"];

export function FormLoja({ config }: { config: Config }) {
  const [estado, acao, pendente] = useAcao(salvarLoja);
  const e = estado.erros ?? {};
  return (
    <form onSubmit={acao} className="flex flex-col gap-4">
      {estado.erro && <Alerta variante="erro">{estado.erro}</Alerta>}
      <Card>
        <CardHeader><CardTitle>Loja</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo id="nome_loja" rotulo="Nome da loja" erro={e.nome_loja} obrigatorio className="sm:col-span-2">
            <Input name="nome_loja" defaultValue={config.nome_loja} />
          </Campo>
          <Campo id="cidade" rotulo="Cidade" erro={e.cidade} obrigatorio>
            <Input name="cidade" defaultValue={config.cidade} />
          </Campo>
          <Campo id="uf" rotulo="UF" erro={e.uf} obrigatorio>
            <Input name="uf" defaultValue={config.uf} maxLength={2} />
          </Campo>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp e anúncios</CardTitle>
          <CardDescription>Usados no botão “Chamar no WhatsApp” e nas legendas geradas.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Campo id="whatsapp_numero" rotulo="Número do WhatsApp" erro={e.whatsapp_numero} dica="55 + DDD + número, sem espaços" obrigatorio>
            <Input name="whatsapp_numero" defaultValue={config.whatsapp_numero} inputMode="numeric" />
          </Campo>
          <Campo id="regiao_anuncio" rotulo="Região (linha 📍)" erro={e.regiao_anuncio} obrigatorio>
            <Input name="regiao_anuncio" defaultValue={config.regiao_anuncio} />
          </Campo>
          <Campo id="assinatura" rotulo="Assinatura" erro={e.assinatura} obrigatorio>
            <Input name="assinatura" defaultValue={config.assinatura} />
          </Campo>
          <Campo id="telefones_assinatura" rotulo="Telefones (linha 📲)" erro={e.telefones_assinatura} obrigatorio>
            <Input name="telefones_assinatura" defaultValue={config.telefones_assinatura} />
          </Campo>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Garantia e alertas</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Campo id="garantia_dias_padrao" rotulo="Prazo padrão da garantia (dias)" erro={e.garantia_dias_padrao} obrigatorio>
            <Input name="garantia_dias_padrao" type="number" inputMode="numeric" defaultValue={config.garantia_dias_padrao} />
          </Campo>
          <Campo id="alerta_garantia_dias" rotulo="Avisar garantias que vencem em (dias)" erro={e.alerta_garantia_dias}>
            <Input name="alerta_garantia_dias" type="number" inputMode="numeric" defaultValue={config.alerta_garantia_dias} />
          </Campo>
          <Campo id="garantia_cobertura_padrao" rotulo="Cobertura padrão da garantia" erro={e.garantia_cobertura_padrao} className="sm:col-span-2"
            dica="A definir pelo dono. Ex.: motor e câmbio, por 90 dias ou 3.000 km.">
            <Textarea name="garantia_cobertura_padrao" defaultValue={config.garantia_cobertura_padrao ?? ""} rows={10} />
          </Campo>
          <Campo id="estoque_parado_dias" rotulo="Carro parado após (dias)" erro={e.estoque_parado_dias}>
            <Input name="estoque_parado_dias" type="number" inputMode="numeric" defaultValue={config.estoque_parado_dias} />
          </Campo>
          <Campo id="alerta_contas_dias" rotulo="Avisar contas que vencem em (dias)" erro={e.alerta_contas_dias}>
            <Input name="alerta_contas_dias" type="number" inputMode="numeric" defaultValue={config.alerta_contas_dias} />
          </Campo>
          <Campo id="recebimento_consignado_padrao" rotulo="Venda de consignado: padrão de recebimento" className="sm:col-span-2"
            dica="Pode ser trocado em cada venda. Confirme com seu contador qual modo usar.">
            <Select name="recebimento_consignado_padrao" defaultValue={config.recebimento_consignado_padrao}>
              <option value="loja_repassa">Loja recebe e repassa ao dono</option>
              <option value="direto_dono">Comprador paga direto ao dono (loja recebe só a comissão)</option>
            </Select>
          </Campo>
        </CardContent>
      </Card>
      <Button type="submit" size="lg" disabled={pendente} className="sm:self-end">
        {pendente && <Loader2 className="animate-spin" />}
        Salvar
      </Button>
    </form>
  );
}
