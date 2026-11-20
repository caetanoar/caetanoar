import Link from "next/link";
import { Store, Users, Percent, Target, FileText, Plug, History, ChevronRight, Tags, ScanSearch, Receipt } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { Card } from "@/components/ui/card";

const ITENS = [
  { href: "/configuracoes/loja", titulo: "Dados da loja", desc: "WhatsApp, assinatura dos anúncios, garantia padrão e alertas", icone: Store },
  { href: "/configuracoes/usuarios", titulo: "Usuários", desc: "Convidar, definir perfil e desativar acessos", icone: Users },
  { href: "/configuracoes/comissoes", titulo: "Regras de comissão", desc: "Consignado, vendedores e parceiros", icone: Percent },
  { href: "/configuracoes/metas", titulo: "Metas", desc: "Metas mensais da loja e de cada vendedor", icone: Target },
  { href: "/financeiro/categorias", titulo: "Categorias financeiras", desc: "Receitas e despesas", icone: Tags },
  { href: "/configuracoes/fiscal", titulo: "Fiscal", desc: "CNPJ, regime, CFOPs e provedor de NF-e", icone: FileText },
  { href: "/configuracoes/orcamentos", titulo: "Orçamentos", desc: "Validade padrão, limite de desconto e taxas da simulação", icone: Receipt },
  { href: "/configuracoes/consulta-veicular", titulo: "Consulta veicular", desc: "Custo por consulta, limite mensal e validade", icone: ScanSearch },
  { href: "/configuracoes/integracoes", titulo: "Integrações", desc: "Chaves de API, webhooks, Open Finance e IA", icone: Plug },
  { href: "/configuracoes/auditoria", titulo: "Auditoria", desc: "Quem criou, alterou ou excluiu cada registro", icone: History },
];

export default async function Configuracoes() {
  await exigirPermissao("configuracoes");
  return (
    <>
      <Cabecalho titulo="Configurações" subtitulo="Somente o dono altera estas opções" />
      <Conteudo>
        <Card className="divide-y overflow-hidden p-0">
          {ITENS.map((i) => (
            <Link key={i.href} href={i.href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/60">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <i.icone className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{i.titulo}</span>
                <span className="block truncate text-sm text-muted-foreground">{i.desc}</span>
              </span>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Link>
          ))}
        </Card>
      </Conteudo>
    </>
  );
}
