import { ListChecks, ClipboardCheck } from "lucide-react";
import { pode, type Papel } from "@/lib/auth/permissoes";
import { listarTarefas, listarUsuariosAtivos, itensChecklist } from "@/lib/tarefas/consultas";
import { hojeISO } from "@/lib/format/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListaTarefas } from "./lista-tarefas";
import { NovaTarefa } from "./nova-tarefa";
import { Checklist } from "./checklist";

/** Tarefas ligadas a um carro, venda, cliente, garantia ou orçamento. */
export async function TarefasDaEntidade({ entidade, entidadeId, usuario, voltar }: {
  entidade: "veiculo" | "venda" | "cliente" | "garantia" | "orcamento";
  entidadeId: string;
  usuario: { id: string; papel: Papel };
  voltar: string;
}) {
  const gestao = pode(usuario.papel, "estoque.gerenciar");
  const [tarefas, pessoas] = await Promise.all([
    listarTarefas({ entidade, entidadeId, abertas: true }),
    gestao ? listarUsuariosAtivos() : Promise.resolve([]),
  ]);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-1.5"><ListChecks className="size-4" /> Tarefas</CardTitle>
        <NovaTarefa eu={usuario.id} entidade={entidade} entidadeId={entidadeId} voltar={voltar}
          pessoas={gestao ? pessoas.map((p) => ({ id: p.id, nome: p.nome })) : undefined} rotulo="Tarefa" />
      </CardHeader>
      <CardContent>
        <ListaTarefas tarefas={tarefas} hoje={hojeISO()} mostrarResponsavel={gestao} voltar={voltar} vazio="Nenhuma tarefa aberta." />
      </CardContent>
    </Card>
  );
}

/** Checklist de preparação (carro) ou de documentação/transferência (venda). */
export async function ChecklistCard({ tipo, veiculoId, vendaId, podeMarcar, voltar, titulo }: {
  tipo: "preparacao" | "documentacao";
  veiculoId?: string;
  vendaId?: string;
  podeMarcar: boolean;
  voltar: string;
  titulo?: string;
}) {
  const itens = await itensChecklist({ tipo, veiculoId, vendaId });
  if (!itens.length) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <ClipboardCheck className="size-4" /> {titulo ?? (tipo === "preparacao" ? "Checklist de preparação" : "Documentação e transferência")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Checklist itens={itens} voltar={voltar} podeMarcar={podeMarcar} hoje={hojeISO()} />
      </CardContent>
    </Card>
  );
}
