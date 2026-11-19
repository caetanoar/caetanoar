import { notFound } from "next/navigation";
import { Construction } from "lucide-react";
import { MENU } from "@/components/app/navegacao";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";

// Rotas dos módulos ainda em construção (removido na fase final).
export default async function EmBreve({ params }: { params: Promise<{ emBreve: string[] }> }) {
  const { emBreve } = await params;
  const href = `/${emBreve.join("/")}`;
  const item = MENU.find((m) => m.href === href);
  if (!item) notFound();
  return (
    <>
      <Cabecalho titulo={item.rotulo} />
      <Conteudo>
        <Vazio icone={Construction} titulo="Módulo em construção">
          Este módulo faz parte do plano e será entregue nas próximas fases.
        </Vazio>
      </Conteudo>
    </>
  );
}
