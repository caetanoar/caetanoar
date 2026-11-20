import { exigirUsuario } from "@/lib/auth/sessao";
import { Shell } from "@/components/app/shell";
import { contarTarefasAtrasadas } from "@/lib/tarefas/consultas";
import { hojeISO } from "@/lib/format/data";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  const tarefasAtrasadas = await contarTarefasAtrasadas(usuario.id, hojeISO());
  return (
    <Shell usuario={{ nome: usuario.nome, papel: usuario.papel, email: usuario.email }} tarefasAtrasadas={tarefasAtrasadas}>
      {children}
    </Shell>
  );
}
