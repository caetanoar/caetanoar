"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ESTADO_INICIAL, type EstadoAcao } from "@/lib/acoes";

/** useActionState + toast de sucesso/erro + callback ao concluir com sucesso. */
export function useAcao<T = unknown>(
  acao: (estado: EstadoAcao<T>, fd: FormData) => Promise<EstadoAcao<T>>,
  opcoes: { onSucesso?: (estado: EstadoAcao<T>) => void; toastErro?: boolean } = {},
) {
  const [estado, despachar, pendente] = useActionState(acao, ESTADO_INICIAL as EstadoAcao<T>);
  const ultimo = useRef(estado);
  const { onSucesso, toastErro = true } = opcoes;
  useEffect(() => {
    if (ultimo.current === estado) return;
    ultimo.current = estado;
    if (estado.ok) {
      if (estado.mensagem) toast.success(estado.mensagem);
      onSucesso?.(estado);
    } else if (estado.erro && toastErro) {
      toast.error(estado.erro);
    }
  }, [estado, onSucesso, toastErro]);
  return [estado, despachar, pendente] as const;
}
