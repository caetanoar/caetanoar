"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { lancarCusto } from "@/lib/preparacao/acoes";
import { useAcao } from "@/components/form/use-acao";
import { Campo } from "@/components/form/campo";
import { InputMoeda, InputData } from "@/components/form/inputs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function FormCustoPreparacao({ veiculoId, tipos }: { veiculoId: string; tipos: Record<string, string> }) {
  const [versao, setVersao] = useState(0); // remonta o formulário (zera também o campo de valor)
  const [estado, aoEnviar, pendente] = useAcao(lancarCusto, { onSucesso: () => setVersao((n) => n + 1) });
  const e = estado.erros ?? {};
  return (
    <form key={versao} onSubmit={aoEnviar} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="hidden" name="veiculo_id" value={veiculoId} />
      <Campo id="custo-tipo" rotulo="Tipo" erro={e.tipo} obrigatorio>
        <Select id="custo-tipo" name="tipo" defaultValue="">
          <option value="" disabled>Escolha…</option>
          {Object.entries(tipos).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
        </Select>
      </Campo>
      <Campo id="custo-valor" rotulo="Valor" erro={e.valor} obrigatorio>
        <InputMoeda id="custo-valor" name="valor" />
      </Campo>
      <Campo id="custo-descricao" rotulo="Descrição" erro={e.descricao}>
        <Input id="custo-descricao" name="descricao" placeholder="Ex.: troca de pastilhas" maxLength={300} />
      </Campo>
      <Campo id="custo-data" rotulo="Data" erro={e.data} dica="Vazio = hoje">
        <InputData id="custo-data" name="data" />
      </Campo>
      <Button type="submit" disabled={pendente} className="sm:col-span-2">{pendente ? <Loader2 className="animate-spin" /> : <Plus />} Lançar custo</Button>
    </form>
  );
}
