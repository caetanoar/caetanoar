import { redirect } from "next/navigation";
import { exigirUsuario } from "@/lib/auth/sessao";
import { paginaInicial } from "@/lib/auth/permissoes";

export default async function Inicio() {
  const usuario = await exigirUsuario();
  redirect(paginaInicial(usuario.papel));
}
