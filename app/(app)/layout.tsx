import { exigirUsuario } from "@/lib/auth/sessao";
import { Shell } from "@/components/app/shell";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario();
  return <Shell usuario={{ nome: usuario.nome, papel: usuario.papel, email: usuario.email }}>{children}</Shell>;
}
