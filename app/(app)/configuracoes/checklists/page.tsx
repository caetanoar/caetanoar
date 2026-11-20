import { Wrench, FileCheck2 } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alerta } from "@/components/ui/misc";
import { EditorChecklist, type ItemModelo } from "./editor";

export const metadata = { title: "Checklists" };

export default async function ConfigChecklists() {
  await exigirPermissao("configuracoes");
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("checklist_modelos").select("id, tipo, item, ordem, prazo_dias, ativo").order("ordem").order("item");
  const de = (tipo: string): ItemModelo[] => (data ?? []).filter((i) => i.tipo === tipo);
  return (
    <>
      <Cabecalho titulo="Checklists" subtitulo="Modelos de preparação e de documentação" voltar="/configuracoes" />
      <Conteudo className="flex max-w-2xl flex-col gap-4">
        <Alerta variante="info">
          As mudanças valem para os próximos checklists. Carros já em preparação e vendas já fechadas mantêm os itens que tinham. Item desativado deixa de entrar nos novos checklists.
        </Alerta>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><Wrench className="size-4" /> Preparação do carro</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">Criado quando o carro entra em preparação. Prazo em dias a partir da entrada.</p>
            <EditorChecklist tipo="preparacao" itens={de("preparacao")} rotuloPrazo="Prazo (dias)" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><FileCheck2 className="size-4" /> Documentação e transferência</CardTitle></CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">Criado quando a venda fecha. Prazo em dias a partir do fechamento.</p>
            <EditorChecklist tipo="documentacao" itens={de("documentacao")} rotuloPrazo="Prazo (dias)" />
          </CardContent>
        </Card>
      </Conteudo>
    </>
  );
}
