import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, History } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { ListaDados } from "@/components/app/lista-dados";
import { ContatoRapido } from "@/components/cadastros/contato-rapido";
import { BotaoExcluir } from "@/components/cadastros/botao-excluir";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TIPOS_FORNECEDOR } from "@/lib/cadastros/esquemas";
import { formatarDocumento } from "@/lib/format/documentos";
import { formatarTelefone } from "@/lib/format/telefone";
import { formatarData } from "@/lib/format/data";
import { excluirFornecedor } from "../acoes";
import { HistoricoFornecedor } from "./historico";

export default async function DetalheFornecedor({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermissao("fornecedores");
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const { data: f } = await supabase.from("fornecedores").select("*").eq("id", id).maybeSingle();
  if (!f) notFound();

  return (
    <>
      <Cabecalho
        titulo={f.nome}
        subtitulo={TIPOS_FORNECEDOR[f.tipo]}
        voltar="/fornecedores"
        acoes={<Button asChild size="sm" variant="outline"><Link href={`/fornecedores/${id}/editar`}><Pencil /> Editar</Link></Button>}
      />
      <Conteudo className="flex max-w-3xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{TIPOS_FORNECEDOR[f.tipo]}</Badge>
          {!f.ativo && <Badge variant="destructive">Inativo</Badge>}
          {f.tipo_pessoa && <Badge variant="outline">{f.tipo_pessoa === "PJ" ? "Pessoa jurídica" : "Pessoa física"}</Badge>}
        </div>
        <ContatoRapido telefone={f.telefone} whatsapp={f.whatsapp} email={f.email} />
        <Card>
          <CardHeader><CardTitle>Dados</CardTitle></CardHeader>
          <CardContent>
            <ListaDados
              itens={[
                { rotulo: "Razão social", valor: f.razao_social, largo: true },
                { rotulo: "CPF/CNPJ", valor: f.documento && formatarDocumento(f.documento) },
                { rotulo: "Contato", valor: f.contato_nome },
                { rotulo: "Telefone", valor: f.telefone && formatarTelefone(f.telefone) },
                { rotulo: "WhatsApp", valor: f.whatsapp && formatarTelefone(f.whatsapp) },
                { rotulo: "E-mail", valor: f.email },
                { rotulo: "Cidade", valor: [f.cidade, f.uf].filter(Boolean).join("/") },
                { rotulo: "Chave Pix", valor: f.chave_pix },
                { rotulo: "Dados bancários", valor: f.dados_bancarios },
                { rotulo: "Observações", valor: f.observacoes, largo: true },
                { rotulo: "Cadastrado em", valor: formatarData(f.criado_em) },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="size-4" /> Histórico de compras e serviços</CardTitle></CardHeader>
          <CardContent><HistoricoFornecedor id={id} /></CardContent>
        </Card>
        <div className="flex justify-end">
          <BotaoExcluir id={id} acao={excluirFornecedor} destino="/fornecedores" titulo="Excluir fornecedor?" />
        </div>
      </Conteudo>
    </>
  );
}
