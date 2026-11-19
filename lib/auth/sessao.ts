import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { pode, type Papel, type Recurso } from "./permissoes";

export type UsuarioAtual = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  telefone: string | null;
};

/** Usuário logado e ativo (uma consulta por requisição). Null se não houver. */
export const obterUsuarioAtual = cache(async (): Promise<UsuarioAtual | null> => {
  const supabase = await criarClienteServidor();
  const { data: claims } = await supabase.auth.getClaims();
  const id = claims?.claims?.sub;
  if (!id) return null;
  const { data } = await supabase
    .from("usuarios")
    .select("id, nome, email, papel, telefone, ativo")
    .eq("id", id)
    .maybeSingle();
  if (!data || !data.ativo) return null;
  return { id: data.id, nome: data.nome, email: data.email, papel: data.papel, telefone: data.telefone };
});

/** Exige login; redireciona para /login (sem sessão) ou /sem-acesso (conta inativa). */
export async function exigirUsuario(): Promise<UsuarioAtual> {
  const usuario = await obterUsuarioAtual();
  if (!usuario) {
    const supabase = await criarClienteServidor();
    const { data } = await supabase.auth.getClaims();
    redirect(data?.claims?.sub ? "/sem-acesso?motivo=inativo" : "/login");
  }
  return usuario;
}

/** Exige permissão para o recurso; manda para /sem-acesso caso contrário. */
export async function exigirPermissao(recurso: Recurso): Promise<UsuarioAtual> {
  const usuario = await exigirUsuario();
  if (!pode(usuario.papel, recurso)) redirect("/sem-acesso");
  return usuario;
}
