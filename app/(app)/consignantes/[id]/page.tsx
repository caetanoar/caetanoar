import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Car } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { ListaDados } from "@/components/app/lista-dados";
import { ContatoRapido } from "@/components/cadastros/contato-rapido";
import { BotaoExcluir } from "@/components/cadastros/botao-excluir";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarDocumento } from "@/lib/format/documentos";
import { formatarTelefone } from "@/lib/format/telefone";
import { formatarData } from "@/lib/format/data";
import { excluirConsignante } from "../acoes";
import { CarrosDoConsignante } from "./carros";

export default async function DetalheConsignante({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissao("consignantes");
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const { data: c } = await supabase.from("consignantes").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  return (
    <>
      <Cabecalho
        titulo={c.nome}
        subtitulo="Consignante"
        voltar="/consignantes"
        acoes={<Button asChild size="sm" variant="outline"><Link href={`/consignantes/${id}/editar`}><Pencil /> Editar</Link></Button>}
      />
      <Conteudo className="flex max-w-3xl flex-col gap-4">
        {!c.ativo && <Badge variant="destructive">Inativo</Badge>}
        <ContatoRapido telefone={c.telefone} whatsapp={c.whatsapp} email={c.email} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Car className="size-4" /> Carros consignados</CardTitle></CardHeader>
          <CardContent><CarrosDoConsignante id={id} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Dados</CardTitle></CardHeader>
          <CardContent>
            <ListaDados
              itens={[
                { rotulo: "CPF/CNPJ", valor: c.documento && formatarDocumento(c.documento) },
                { rotulo: "Telefone", valor: c.telefone && formatarTelefone(c.telefone) },
                { rotulo: "WhatsApp", valor: c.whatsapp && formatarTelefone(c.whatsapp) },
                { rotulo: "E-mail", valor: c.email },
                { rotulo: "Cidade", valor: [c.cidade, c.uf].filter(Boolean).join("/") },
                { rotulo: "Endereço", valor: c.endereco, largo: true },
                { rotulo: "Chave Pix (repasse)", valor: c.chave_pix },
                { rotulo: "Dados bancários", valor: c.dados_bancarios },
                { rotulo: "Observações", valor: c.observacoes, largo: true },
                { rotulo: "Cadastrado em", valor: formatarData(c.criado_em) },
              ]}
            />
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <BotaoExcluir id={id} acao={excluirConsignante} destino="/consignantes" titulo="Excluir consignante?" />
        </div>
      </Conteudo>
    </>
  );
}
