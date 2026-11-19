import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Coins } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { ListaDados } from "@/components/app/lista-dados";
import { ContatoRapido } from "@/components/cadastros/contato-rapido";
import { BotaoExcluir } from "@/components/cadastros/botao-excluir";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TIPOS_PARCEIRO } from "@/lib/cadastros/esquemas";
import { formatarDocumento } from "@/lib/format/documentos";
import { formatarTelefone } from "@/lib/format/telefone";
import { excluirParceiro } from "../acoes";
import { ComissoesDoParceiro } from "./comissoes";

export default async function DetalheParceiro({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissao("parceiros");
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const { data: p } = await supabase.from("parceiros").select("*").eq("id", id).maybeSingle();
  if (!p) notFound();
  return (
    <>
      <Cabecalho
        titulo={p.nome}
        subtitulo={TIPOS_PARCEIRO[p.tipo]}
        voltar="/parceiros"
        acoes={<Button asChild size="sm" variant="outline"><Link href={`/parceiros/${id}/editar`}><Pencil /> Editar</Link></Button>}
      />
      <Conteudo className="flex max-w-3xl flex-col gap-4">
        {!p.ativo && <Badge variant="destructive">Inativo</Badge>}
        <ContatoRapido telefone={p.telefone} whatsapp={p.whatsapp} email={p.email} />
        <Card>
          <CardHeader><CardTitle>Dados</CardTitle></CardHeader>
          <CardContent>
            <ListaDados
              itens={[
                { rotulo: "Tipo", valor: TIPOS_PARCEIRO[p.tipo] },
                { rotulo: "CPF/CNPJ", valor: p.documento && formatarDocumento(p.documento) },
                { rotulo: "Telefone", valor: p.telefone && formatarTelefone(p.telefone) },
                { rotulo: "WhatsApp", valor: p.whatsapp && formatarTelefone(p.whatsapp) },
                { rotulo: "E-mail", valor: p.email },
                { rotulo: "Cidade", valor: p.cidade },
                { rotulo: "Chave Pix", valor: p.chave_pix },
                { rotulo: "Observações", valor: p.observacoes, largo: true },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Coins className="size-4" /> Comissões de indicação</CardTitle></CardHeader>
          <CardContent><ComissoesDoParceiro id={id} /></CardContent>
        </Card>
        <div className="flex justify-end">
          <BotaoExcluir id={id} acao={excluirParceiro} destino="/parceiros" titulo="Excluir parceiro?" />
        </div>
      </Conteudo>
    </>
  );
}
