import { ListChecks } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { listarTarefas, listarUsuariosAtivos, type TarefaLista } from "@/lib/tarefas/consultas";
import { hojeISO } from "@/lib/format/data";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { AbasLink } from "@/components/app/abas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { ListaTarefas } from "@/components/tarefas/lista-tarefas";
import { NovaTarefa } from "@/components/tarefas/nova-tarefa";

export const metadata = { title: "Minhas tarefas" };

export default async function Tarefas({ searchParams }: { searchParams: Promise<{ ver?: string; pessoa?: string }> }) {
  const usuario = await exigirPermissao("tarefas");
  const gestao = pode(usuario.papel, "estoque.gerenciar");
  const sp = await searchParams;
  const ver = sp.ver === "concluidas" ? "concluidas" : "abertas";
  // Gestão vê a equipe toda (ou filtra por pessoa); os demais, só as próprias.
  const pessoa = gestao ? (sp.pessoa === "todas" ? null : sp.pessoa || usuario.id) : usuario.id;
  const [tarefas, pessoas] = await Promise.all([
    listarTarefas({ abertas: ver === "abertas", responsavel: pessoa }),
    gestao ? listarUsuariosAtivos() : Promise.resolve([]),
  ]);
  const hoje = hojeISO();
  const grupos: { titulo: string; itens: TarefaLista[] }[] =
    ver === "abertas"
      ? [
          { titulo: "Atrasadas", itens: tarefas.filter((t) => t.prazo && t.prazo < hoje) },
          { titulo: "Hoje", itens: tarefas.filter((t) => t.prazo === hoje) },
          { titulo: "Próximas", itens: tarefas.filter((t) => t.prazo && t.prazo > hoje) },
          { titulo: "Sem prazo", itens: tarefas.filter((t) => !t.prazo) },
        ].filter((g) => g.itens.length)
      : [{ titulo: "Concluídas e canceladas", itens: tarefas }];
  const filtroPessoa = gestao && sp.pessoa === "todas" ? "todas" : pessoa && pessoa !== usuario.id ? pessoa : null;
  const base = filtroPessoa ? `/tarefas?pessoa=${filtroPessoa}` : "/tarefas";

  return (
    <>
      <Cabecalho
        titulo={gestao && pessoa !== usuario.id ? "Tarefas da equipe" : "Minhas tarefas"}
        subtitulo={`${tarefas.length} tarefa(s)`}
        acoes={<NovaTarefa eu={usuario.id} pessoas={gestao ? pessoas.map((p) => ({ id: p.id, nome: p.nome })) : undefined} voltar="/tarefas" />}
      />
      <Conteudo className="flex flex-col gap-4">
        <AbasLink abas={[{ id: "abertas", rotulo: "Abertas" }, { id: "concluidas", rotulo: "Concluídas" }]} atual={ver} base={base} parametro="ver" />
        {gestao && (
          <form className="flex items-center gap-2" action="/tarefas">
            <input type="hidden" name="ver" value={ver} />
            <label htmlFor="filtro-pessoa" className="text-sm text-muted-foreground">Responsável</label>
            <Select id="filtro-pessoa" name="pessoa" defaultValue={sp.pessoa === "todas" ? "todas" : pessoa ?? usuario.id} className="max-w-xs">
              <option value="todas">Toda a equipe</option>
              {pessoas.map((p) => <option key={p.id} value={p.id}>{p.id === usuario.id ? `${p.nome} (eu)` : p.nome}</option>)}
            </Select>
            <button type="submit" className="text-sm text-primary hover:underline">Filtrar</button>
          </form>
        )}
        {grupos.length === 0 ? (
          <Vazio icone={ListChecks} titulo={ver === "abertas" ? "Nada pendente" : "Nenhuma tarefa concluída"}>
            {ver === "abertas" ? "Quando houver tarefas para você, elas aparecem aqui." : null}
          </Vazio>
        ) : (
          grupos.map((g) => (
            <Card key={g.titulo}>
              <CardHeader className="pb-0">
                <CardTitle className={g.titulo === "Atrasadas" ? "text-destructive" : undefined}>{g.titulo} ({g.itens.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ListaTarefas tarefas={g.itens} hoje={hoje} mostrarResponsavel={gestao && pessoa !== usuario.id} voltar="/tarefas" />
              </CardContent>
            </Card>
          ))
        )}
      </Conteudo>
    </>
  );
}
