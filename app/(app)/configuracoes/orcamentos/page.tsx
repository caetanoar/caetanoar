import { exigirPermissao } from "@/lib/auth/sessao";
import { configOrcamento } from "@/lib/orcamentos/consultas";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { FormConfigOrcamentos } from "./form";

export const metadata = { title: "Orçamentos" };

export default async function ConfigOrcamentos() {
  await exigirPermissao("configuracoes");
  const cfg = await configOrcamento();
  return (
    <>
      <Cabecalho titulo="Orçamentos" subtitulo="Validade, limite de desconto e simulação" voltar="/configuracoes" />
      <Conteudo className="max-w-2xl">
        <FormConfigOrcamentos
          validadeDias={cfg.validadeDias}
          limiteVendedor={cfg.limites.vendedor ?? null}
          limiteGerente={cfg.limites.gerente ?? null}
          taxas={cfg.taxas.map((t) => `${t.prazo}; ${String(t.taxa_mensal).replace(".", ",")}`).join("\n")}
        />
      </Conteudo>
    </>
  );
}
