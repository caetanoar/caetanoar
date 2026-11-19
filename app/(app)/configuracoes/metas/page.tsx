import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { InputData } from "@/components/form/inputs";
import { Button } from "@/components/ui/button";
import { inicioDoMes, nomeDoMes } from "@/lib/format/data";
import { FormMetas } from "./form-metas";

export default async function Metas({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const usuario = await exigirPermissao("dashboard");
  const { mes: m } = await searchParams;
  const mes = inicioDoMes(m && /^\d{4}-\d{2}-\d{2}$/.test(m) ? m : undefined);
  const supabase = await criarClienteServidor();
  const [{ data: metas }, { data: vendedores }] = await Promise.all([
    supabase.from("metas").select("*").eq("mes", mes),
    supabase.rpc("listar_vendedores"),
  ]);
  return (
    <>
      <Cabecalho titulo="Metas" subtitulo={nomeDoMes(mes)} voltar={usuario.papel === "dono" ? "/configuracoes" : "/dashboard"} />
      <Conteudo className="flex max-w-3xl flex-col gap-4">
        <form className="flex gap-2">
          <InputData name="mes" defaultValue={mes} aria-label="Mês" />
          <Button type="submit" variant="outline">Ver mês</Button>
        </form>
        <FormMetas
          key={mes}
          mes={mes}
          podeEditar={usuario.papel === "dono"}
          linhas={[
            { vendedorId: null, nome: "Loja (total)", meta: (metas ?? []).find((x) => x.vendedor_id === null) ?? null },
            ...(vendedores ?? []).filter((v) => v.papel === "vendedor").map((v) => ({ vendedorId: v.id, nome: v.nome, meta: (metas ?? []).find((x) => x.vendedor_id === v.id) ?? null })),
          ]}
        />
      </Conteudo>
    </>
  );
}
