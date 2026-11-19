"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { errosDoZod, type EstadoAcao } from "@/lib/acoes";

const esquemaLogin = z.object({
  email: z.email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe a senha."),
  voltar: z.string().optional(),
});

export async function entrar(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const dados = esquemaLogin.safeParse({
    email: fd.get("email"),
    senha: fd.get("senha"),
    voltar: fd.get("voltar") || undefined,
  });
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error) };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: dados.data.email.toLowerCase(),
    password: dados.data.senha,
  });
  if (error) {
    return { ok: false, erro: "E-mail ou senha incorretos." };
  }
  const voltar = dados.data.voltar?.startsWith("/") && !dados.data.voltar.startsWith("//") ? dados.data.voltar : "/";
  redirect(voltar);
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}

async function urlDoSite() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function recuperarSenha(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const email = z.email("Informe um e-mail válido.").safeParse(fd.get("email"));
  if (!email.success) return { ok: false, erros: { email: ["Informe um e-mail válido."] } };
  const supabase = await criarClienteServidor();
  const site = await urlDoSite();
  await supabase.auth.resetPasswordForEmail(email.data.toLowerCase(), {
    redirectTo: `${site}/auth/confirm?next=/definir-senha`,
  });
  // Mesma resposta exista ou não a conta (não revela quais e-mails estão cadastrados).
  return { ok: true, mensagem: "Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha." };
}

const esquemaSenha = z
  .object({
    senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, { path: ["confirmacao"], message: "As senhas não conferem." });

export async function definirSenha(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const dados = esquemaSenha.safeParse({ senha: fd.get("senha"), confirmacao: fd.get("confirmacao") });
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error) };
  const supabase = await criarClienteServidor();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { ok: false, erro: "O link expirou. Peça um novo convite ou recuperação de senha." };
  const { error } = await supabase.auth.updateUser({ password: dados.data.senha });
  if (error) return { ok: false, erro: "Não foi possível salvar a senha. Tente uma senha diferente." };
  redirect("/");
}
