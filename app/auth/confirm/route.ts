import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";

/** Confirma links de convite e de recuperação de senha enviados por e-mail. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const proximo = searchParams.get("next") ?? "/definir-senha";
  const destino = proximo.startsWith("/") && !proximo.startsWith("//") ? proximo : "/";

  if (tokenHash && tipo) {
    const supabase = await criarClienteServidor();
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(destino, request.url));
    }
  }
  const erro = new URL("/login", request.url);
  erro.searchParams.set("erro", "link-invalido");
  return NextResponse.redirect(erro);
}
