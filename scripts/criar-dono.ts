/**
 * Convida o primeiro dono do sistema (uso único, na instalação).
 *
 *   OWNER_EMAIL=arthur@exemplo.com OWNER_NOME="Arthur" pnpm criar-dono
 *
 * Lê NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SITE_URL
 * do ambiente (ou do .env.local, se existir). Não faz nada se já houver um dono,
 * a menos que receba --forcar. Nunca imprime chaves.
 */
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local") && !process.env.SUPABASE_SERVICE_ROLE_KEY) process.loadEnvFile(".env.local");

const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
const nome = process.env.OWNER_NOME?.trim() || "Arthur";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const forcar = process.argv.includes("--forcar");

function sair(msg: string, codigo = 1): never {
  console[codigo ? "error" : "log"](msg);
  process.exit(codigo);
}

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) sair("Defina OWNER_EMAIL com o e-mail do dono.");
if (!url || !chave) sair("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");

const admin = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const { data: donos, error: erroDonos } = await admin.from("usuarios").select("email").eq("papel", "dono").eq("ativo", true);
  if (erroDonos) sair(`Não foi possível consultar os usuários: ${erroDonos.message}`);
  if (donos?.length && !forcar) {
    sair(`Já existe dono ativo (${donos.map((d) => d.email).join(", ")}). Nada a fazer. Use --forcar para convidar outro.`, 0);
  }

  const { data: existente } = await admin.from("usuarios").select("id").eq("email", email!).maybeSingle();
  let id = existente?.id as string | undefined;

  if (!id) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email!, {
      data: { nome },
      redirectTo: `${site}/auth/confirm?next=/definir-senha`,
    });
    if (error || !data.user) sair(`Falha ao enviar o convite: ${error?.message ?? "sem usuário"}`);
    id = data.user.id;
    console.log(`Convite enviado para ${email}.`);
  } else {
    console.log(`${email} já tem conta; promovendo a dono.`);
  }

  const { error } = await admin.from("usuarios").update({ papel: "dono", nome, ativo: true }).eq("id", id);
  if (error) sair(`Convite enviado, mas não foi possível definir o perfil de dono: ${error.message}`);
  console.log(`Pronto: ${nome} <${email}> é dono. O link do e-mail leva para ${site}/definir-senha.`);
}

main().catch((e) => sair(e instanceof Error ? e.message : String(e)));
