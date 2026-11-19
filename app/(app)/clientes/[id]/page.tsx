import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Lock, ShoppingBag, Sparkles, History } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { ListaDados } from "@/components/app/lista-dados";
import { ContatoRapido } from "@/components/cadastros/contato-rapido";
import { BotaoExcluir } from "@/components/cadastros/botao-excluir";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alerta } from "@/components/ui/misc";
import { SeletorEtapa, CpfProtegido, Contatos, Interesses } from "@/components/clientes/ficha";
import { ORIGEM_LEAD, MOTIVO_PERDA } from "@/lib/clientes/rotulos";
import { STATUS_VEICULO, nomeVeiculo } from "@/lib/estoque/rotulos";
import { formatarTelefone } from "@/lib/format/telefone";
import { formatarData } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/moeda";
import { linkWhatsApp, mensagemVeiculo } from "@/lib/whatsapp";
import { excluirCliente, anonimizarCliente } from "../acoes";

export default async function DetalheCliente({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await exigirPermissao("clientes");
  const { id } = await params;
  const supabase = await criarClienteServidor();
  const [{ data: c }, { data: p }, { data: contatos }, { data: interesses }, { data: veiculos }] = await Promise.all([
    supabase.from("v_clientes").select("*").eq("id", id).maybeSingle(),
    supabase.from("clientes_dados_pessoais").select("cpf_mascarado, data_nascimento, cep, logradouro, numero, complemento, bairro, cidade, uf").eq("cliente_id", id).maybeSingle(),
    supabase.from("clientes_contatos").select("id, data_hora, canal, resumo, proximo_passo, proximo_contato_em, usuarios(nome)").eq("cliente_id", id).order("data_hora", { ascending: false }),
    supabase.from("clientes_interesses").select("id, veiculo_id, descricao, preco_max, veiculos(marca, modelo, versao, ano_fabricacao, ano_modelo, preco_anunciado, status)").eq("cliente_id", id).eq("ativo", true).order("criado_em", { ascending: false }),
    supabase.from("veiculos").select("id, marca, modelo, versao, ano_modelo, preco_anunciado").in("status", ["disponivel", "reservado", "em_preparacao"]).order("marca"),
  ]);
  if (!c || !c.id) notFound();
  const contatoCliente = c.whatsapp || c.telefone;
  const gestor = usuario.papel !== "vendedor";
  const endereco = p && [p.logradouro, p.numero, p.complemento, p.bairro, p.cidade && `${p.cidade}${p.uf ? `/${p.uf}` : ""}`, p.cep && `CEP ${p.cep}`].filter(Boolean).join(", ");

  return (
    <>
      <Cabecalho
        titulo={c.nome!}
        subtitulo={[ORIGEM_LEAD[c.origem!], c.cidade].filter(Boolean).join(" · ")}
        voltar="/clientes"
        acoes={!c.anonimizado_em && <Button asChild size="sm" variant="outline"><Link href={`/clientes/${id}/editar`}><Pencil /> Editar</Link></Button>}
      />
      <Conteudo className="flex max-w-3xl flex-col gap-4">
        {c.anonimizado_em && <Alerta variante="aviso">Cliente anonimizado em {formatarData(c.anonimizado_em)} a pedido (LGPD).</Alerta>}
        <ContatoRapido telefone={c.telefone} whatsapp={c.whatsapp} email={c.email} />
        <SeletorEtapa id={id} etapa={c.etapa!} />
        {c.etapa === "perdido" && c.motivo_perda && (
          <Alerta variante="erro" titulo={`Perdido: ${MOTIVO_PERDA[c.motivo_perda]}`}>{c.motivo_perda_detalhe}</Alerta>
        )}
        {c.followup_pendente && <Alerta variante="aviso">Retorno marcado para {formatarData(c.proximo_contato_em)}. Registre o contato quando falar com o cliente.</Alerta>}

        <Card>
          <CardHeader><CardTitle>Carros de interesse</CardTitle></CardHeader>
          <CardContent>
            <Interesses
              clienteId={id}
              veiculos={(veiculos ?? []).map((v) => ({ id: v.id, nome: `${nomeVeiculo(v)} ${v.ano_modelo ?? ""}`.trim() }))}
              interesses={(interesses ?? []).map((i) => {
                const v = i.veiculos as { marca: string; modelo: string; versao: string | null; ano_fabricacao: number | null; ano_modelo: number | null; preco_anunciado: number | null; status: keyof typeof STATUS_VEICULO } | null;
                return {
                  id: i.id,
                  veiculo_id: i.veiculo_id,
                  veiculo: v ? `${nomeVeiculo(v)} ${v.ano_modelo ?? ""}`.trim() : null,
                  preco: v?.preco_anunciado ?? null,
                  status: v ? STATUS_VEICULO[v.status].rotulo : null,
                  descricao: i.descricao,
                  preco_max: i.preco_max,
                  whatsapp: v && contatoCliente && v.status !== "vendido"
                    ? linkWhatsApp(contatoCliente, `Olá, ${c.nome!.split(" ")[0]}! ${mensagemVeiculo(v).replace("Olá! Tenho interesse no", "Separei para você o").replace("Ainda está disponível?", "Quer ver fotos ou agendar uma visita?")}`)
                    : null,
                };
              })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Histórico de contatos</CardTitle></CardHeader>
          <CardContent>
            <Contatos
              clienteId={id}
              contatos={(contatos ?? []).map((ct) => ({ ...ct, usuario: (ct.usuarios as { nome: string } | null)?.nome ?? null }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><Sparkles className="size-4" /> Assistente (IA)</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Resumo do histórico e sugestão da próxima mensagem — disponível no módulo de IA.</p></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><ShoppingBag className="size-4" /> Compras</CardTitle></CardHeader>
          <CardContent><ComprasDoCliente id={id} /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Dados</CardTitle></CardHeader>
          <CardContent>
            <ListaDados
              itens={[
                { rotulo: "WhatsApp", valor: c.whatsapp && formatarTelefone(c.whatsapp) },
                { rotulo: "Telefone", valor: c.telefone && formatarTelefone(c.telefone) },
                { rotulo: "E-mail", valor: c.email },
                { rotulo: "Cidade", valor: c.cidade },
                { rotulo: "Origem", valor: ORIGEM_LEAD[c.origem!] },
                { rotulo: "Indicado por", valor: c.parceiro_nome },
                { rotulo: "Vendedor responsável", valor: c.vendedor_nome ?? "Sem responsável" },
                { rotulo: "Aceita ofertas", valor: c.aceita_marketing ? "Sim" : "Não" },
                { rotulo: "Cadastrado em", valor: formatarData(c.criado_em) },
                { rotulo: "Observações", valor: c.observacoes, largo: true },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1.5"><Lock className="size-4" /> Dados pessoais (LGPD)</CardTitle></CardHeader>
          <CardContent>
            <ListaDados
              itens={[
                { rotulo: "CPF", valor: <CpfProtegido clienteId={id} mascarado={p?.cpf_mascarado ?? null} /> },
                { rotulo: "Nascimento", valor: p?.data_nascimento && formatarData(p.data_nascimento) },
                { rotulo: "Endereço", valor: endereco, largo: true },
              ]}
            />
            <p className="mt-3 text-xs text-muted-foreground">Ao revelar o CPF, o acesso fica registrado com seu nome, data e hora.</p>
          </CardContent>
        </Card>

        {usuario.papel === "dono" && (
          <div className="flex flex-wrap justify-end gap-2">
            <Link href={`/configuracoes/auditoria?registro=${id}`} className="inline-flex items-center gap-1 self-center text-sm text-primary hover:underline">
              <History className="size-4" /> Histórico de alterações
            </Link>
            {!c.anonimizado_em && (
              <BotaoExcluir id={id} acao={anonimizarCliente} rotulo="Anonimizar (LGPD)" titulo="Anonimizar cliente?"
                descricao="Remove nome, telefones, e-mail, CPF e endereço. As vendas continuam nos relatórios sem identificar a pessoa. Use quando o cliente pedir a exclusão dos dados." />
            )}
          </div>
        )}
        {gestor && (
          <div className="flex justify-end">
            <BotaoExcluir id={id} acao={excluirCliente} destino="/clientes" titulo="Excluir cliente?" descricao="Só para cadastros feitos por engano. Clientes com vendas não podem ser excluídos." />
          </div>
        )}
        {gestor && <Badge variant="muted" className="self-end">ID {id.slice(0, 8)}</Badge>}
      </Conteudo>
    </>
  );
}

async function ComprasDoCliente({ id }: { id: string }) {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("v_vendas").select("id, numero, veiculo_nome, data_venda, valor_venda, status").eq("cliente_id", id).neq("status", "cancelada").order("data_venda", { ascending: false });
  return (
    <div className="flex flex-col gap-2">
      {(data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma compra registrada.</p>
      ) : (
        (data ?? []).map((v) => (
          <Link key={v.id} href={`/vendas/${v.id}`} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-secondary/60">
            <span className="min-w-0 truncate">{v.veiculo_nome} · {formatarData(v.data_venda)} · {v.numero}</span>
            <span className="numero font-semibold">{formatarMoeda(v.valor_venda)}</span>
          </Link>
        ))
      )}
      <Button asChild variant="outline" size="sm" className="self-start"><Link href={`/vendas/nova?cliente=${id}`}>Registrar venda para este cliente</Link></Button>
    </div>
  );
}
