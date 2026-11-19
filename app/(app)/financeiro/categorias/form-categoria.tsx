"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus } from "lucide-react";
import { salvarCategoria } from "../acoes";
import { useAcao } from "@/components/form/use-acao";
import { Campo } from "@/components/form/campo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import type { Database } from "@/lib/supabase/database.types";

type Categoria = Database["public"]["Tables"]["categorias_financeiras"]["Row"];

export function FormCategoria({ categoria }: { categoria?: Categoria }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [estado, despachar, pendente] = useAcao(salvarCategoria, { onSucesso: () => { setAberto(false); router.refresh(); } });
  const sistema = Boolean(categoria?.sistema);
  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        {categoria ? <Button variant="ghost" size="icon-sm" aria-label={`Editar ${categoria.nome}`}><Pencil /></Button> : <Button size="sm"><Plus /> Nova</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{categoria ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          {sistema && <DialogDescription>Categoria usada pelas automações: só o nome e o grupo podem mudar.</DialogDescription>}
        </DialogHeader>
        <form onSubmit={despachar} className="flex flex-col gap-3">
          {categoria && <input type="hidden" name="id" value={categoria.id} />}
          <Campo id="cat-nome" rotulo="Nome" erro={estado.erros?.nome} obrigatorio>
            <Input name="nome" defaultValue={categoria?.nome} />
          </Campo>
          <Campo id="cat-tipo" rotulo="Tipo">
            <Select name="tipo" defaultValue={categoria?.tipo ?? "despesa"} disabled={sistema}>
              <option value="despesa">Despesa</option>
              <option value="receita">Receita</option>
            </Select>
          </Campo>
          {sistema && <input type="hidden" name="tipo" value={categoria!.tipo} />}
          <Campo id="cat-grupo" rotulo="Grupo" erro={estado.erros?.grupo} dica="Agrupa nos relatórios (ex.: Estrutura, Pessoal, Comercial)">
            <Input name="grupo" defaultValue={categoria?.grupo ?? "Geral"} />
          </Campo>
          <Campo id="cat-natureza" rotulo="Natureza" dica="Valores de terceiros não entram na receita da loja">
            <Select name="natureza" defaultValue={categoria?.natureza === "transferencia" ? "operacional" : categoria?.natureza ?? "operacional"} disabled={sistema}>
              <option value="operacional">Operacional</option>
              <option value="terceiros">Valores de terceiros</option>
              <option value="estoque">Estoque (compra de veículos)</option>
            </Select>
          </Campo>
          {sistema && <input type="hidden" name="natureza" value={categoria!.natureza} />}
          {categoria && !sistema && (
            <Campo id="cat-ativa" rotulo="Situação">
              <Select name="ativa" defaultValue={String(categoria.ativa)}>
                <option value="true">Ativa</option>
                <option value="false">Inativa</option>
              </Select>
            </Campo>
          )}
          <Button type="submit" disabled={pendente}>{pendente && <Loader2 className="animate-spin" />} Salvar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
