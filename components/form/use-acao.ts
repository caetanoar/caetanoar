"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { ESTADO_INICIAL, type EstadoAcao } from "@/lib/acoes";

/**
 * Executa uma Server Action a partir do `onSubmit` de um formulário:
 * - não limpa o formulário quando a validação falha;
 * - mostra o aviso assim que o servidor responde (mesmo que o componente
 *   saia da tela com a atualização, como um item que deixa uma lista).
 */
export function useAcao<T = unknown>(
  acao: (estado: EstadoAcao<T>, fd: FormData) => Promise<EstadoAcao<T>>,
  opcoes: { onSucesso?: (estado: EstadoAcao<T>) => void; toastErro?: boolean; toastSucesso?: boolean } = {},
) {
  const [estado, setEstado] = useState<EstadoAcao<T>>(ESTADO_INICIAL as EstadoAcao<T>);
  const [pendente, iniciar] = useTransition();
  const atual = useRef(estado);
  const opcoesRef = useRef(opcoes);
  useEffect(() => {
    opcoesRef.current = opcoes;
  });

  const aoEnviar = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
      iniciar(async () => {
        const r = await acao(atual.current, fd);
        atual.current = r;
        setEstado(r);
        const { onSucesso, toastErro = true, toastSucesso = true } = opcoesRef.current;
        if (r.ok) {
          if (r.mensagem && toastSucesso) toast.success(r.mensagem);
          onSucesso?.(r);
        } else if (r.erro && toastErro) {
          toast.error(r.erro);
        }
      });
    },
    [acao],
  );

  return [estado, aoEnviar, pendente] as const;
}
