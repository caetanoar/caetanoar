"use client";

import { startTransition, useActionState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { ESTADO_INICIAL, type EstadoAcao } from "@/lib/acoes";

/**
 * useActionState + toast de sucesso/erro + callback de sucesso.
 * Retorna um handler para `onSubmit` (em vez de `action`), assim o React
 * não limpa o formulário quando a validação falha.
 */
export function useAcao<T = unknown>(
  acao: (estado: EstadoAcao<T>, fd: FormData) => Promise<EstadoAcao<T>>,
  opcoes: { onSucesso?: (estado: EstadoAcao<T>) => void; toastErro?: boolean; toastSucesso?: boolean } = {},
) {
  const [estado, despachar, pendente] = useActionState(acao, ESTADO_INICIAL as EstadoAcao<T>);
  const ultimo = useRef(estado);
  const { onSucesso, toastErro = true, toastSucesso = true } = opcoes;

  useEffect(() => {
    if (ultimo.current === estado) return;
    ultimo.current = estado;
    if (estado.ok) {
      if (estado.mensagem && toastSucesso) toast.success(estado.mensagem);
      onSucesso?.(estado);
    } else if (estado.erro && toastErro) {
      toast.error(estado.erro);
    }
  }, [estado, onSucesso, toastErro, toastSucesso]);

  const aoEnviar = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
      startTransition(() => despachar(fd));
    },
    [despachar],
  );

  return [estado, aoEnviar, pendente] as const;
}
