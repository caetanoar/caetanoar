"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { exigirPermissao } from "@/lib/auth/sessao";
import { errosDoZod, mensagemDeErro, type EstadoAcao } from "@/lib/acoes";
import { apenasDigitos } from "@/lib/utils";

const esquemaLoja = z.object({
  nome_loja: z.string().trim().min(2, "Informe o nome da loja."),
  cidade: z.string().trim().min(2, "Informe a cidade."),
  uf: z.string().trim().length(2, "UF com 2 letras.").transform((v) => v.toUpperCase()),
  regiao_anuncio: z.string().trim().min(2, "Informe a região usada nos anúncios."),
  whatsapp_numero: z
    .string()
    .transform((v) => apenasDigitos(v))
    .refine((v) => /^55\d{10,11}$/.test(v), "Use o formato 55 + DDD + número, ex.: 5537991193815."),
  telefones_assinatura: z.string().trim().min(8, "Informe os telefones da assinatura."),
  assinatura: z.string().trim().min(5, "Informe a assinatura."),
  garantia_dias_padrao: z.coerce.number().int().min(0).max(3650),
  garantia_cobertura_padrao: z.string().trim().max(2000).optional().transform((v) => v || null),
  alerta_garantia_dias: z.coerce.number().int().min(0).max(365),
  estoque_parado_dias: z.coerce.number().int().min(1).max(3650),
  alerta_contas_dias: z.coerce.number().int().min(0).max(365),
  recebimento_consignado_padrao: z.enum(["loja_repassa", "direto_dono"]),
});

export async function salvarLoja(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("configuracoes");
  const dados = esquemaLoja.safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error) };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("configuracoes").update(dados.data).eq("id", true);
  if (error) return { ok: false, erro: mensagemDeErro(error) };
  revalidatePath("/", "layout");
  return { ok: true, mensagem: "Configurações salvas." };
}

const esquemaConvite = z.object({
  nome: z.string().trim().min(2, "Informe o nome."),
  email: z.email("E-mail inválido.").transform((v) => v.toLowerCase()),
  papel: z.enum(["dono", "gerente", "vendedor", "atendimento", "preparador", "administrativo"]),
});

export async function convidarUsuario(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  await exigirPermissao("configuracoes");
  const dados = esquemaConvite.safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erros: errosDoZod(dados.error) };

  const admin = criarClienteAdmin();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await admin.auth.admin.inviteUserByEmail(dados.data.email, {
    data: { nome: dados.data.nome },
    redirectTo: `${site}/auth/confirm?next=/definir-senha`,
  });
  if (error) {
    const jaExiste = /already|registered|exists/i.test(error.message);
    return { ok: false, erro: jaExiste ? "Já existe um usuário com este e-mail." : `Não foi possível enviar o convite: ${error.message}` };
  }
  // O perfil é criado pelo banco; o papel é definido com a sessão do dono (fica na auditoria).
  const supabase = await criarClienteServidor();
  const { error: erroPapel } = await supabase
    .from("usuarios")
    .update({ papel: dados.data.papel, nome: dados.data.nome })
    .eq("id", data.user.id);
  if (erroPapel) return { ok: false, erro: mensagemDeErro(erroPapel) };
  revalidatePath("/configuracoes/usuarios");
  return { ok: true, mensagem: `Convite enviado para ${dados.data.email}.` };
}

const esquemaAlterar = z.object({
  id: z.uuid(),
  papel: z.enum(["dono", "gerente", "vendedor", "atendimento", "preparador", "administrativo"]),
  ativo: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export async function alterarUsuario(_: EstadoAcao, fd: FormData): Promise<EstadoAcao> {
  const eu = await exigirPermissao("configuracoes");
  const dados = esquemaAlterar.safeParse(Object.fromEntries(fd));
  if (!dados.success) return { ok: false, erro: "Dados inválidos." };
  if (dados.data.id === eu.id && (!dados.data.ativo || dados.data.papel !== "dono")) {
    return { ok: false, erro: "Você não pode rebaixar ou desativar o próprio acesso." };
  }
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from("usuarios")
    .update({ papel: dados.data.papel, ativo: dados.data.ativo })
    .eq("id", dados.data.id);
  if (error) return { ok: false, erro: mensagemDeErro(error) };

  // Bloqueia (ou libera) o login de quem foi desativado.
  const admin = criarClienteAdmin();
  await admin.auth.admin.updateUserById(dados.data.id, { ban_duration: dados.data.ativo ? "none" : "876000h" });

  revalidatePath("/configuracoes/usuarios");
  return { ok: true, mensagem: "Usuário atualizado." };
}
