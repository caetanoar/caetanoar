import { exigirPermissao } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { carrosParaOrcamento, clientesParaOrcamento, configOrcamento } from "@/lib/orcamentos/consultas";
import { consultaPorId } from "@/lib/consulta-veicular/consultas";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { FormOrcamento, type ValoresOrcamento } from "../form-orcamento";

export const metadata = { title: "Novo orçamento" };

export default async function NovoOrcamento({ searchParams }: { searchParams: Promise<{ veiculo?: string; cliente?: string; troca?: string }> }) {
  const usuario = await exigirPermissao("orcamentos");
  const sp = await searchParams;
  const [carros, clientes, cfg, troca] = await Promise.all([
    carrosParaOrcamento(),
    clientesParaOrcamento(),
    configOrcamento(),
    sp.troca && /^[0-9a-f-]{36}$/i.test(sp.troca) ? consultaPorId(sp.troca) : Promise.resolve(null),
  ]);
  const hoje = new Date();
  const validade = cfg.validadeDias ? new Date(hoje.getTime() + cfg.validadeDias * 86_400_000).toISOString().slice(0, 10) : null;
  const valores: ValoresOrcamento = {
    veiculo_id: carros.some((c) => c.id === sp.veiculo) ? sp.veiculo : undefined,
    cliente_id: clientes.some((c) => c.id === sp.cliente) ? sp.cliente : undefined,
    validade,
    trocas: troca && troca.status === "encontrado"
      ? [{ consulta_id: troca.id, placa: troca.placa, marca: troca.dados.marca ?? "", modelo: troca.dados.modelo ?? "", versao: troca.dados.versao ?? null,
           ano_fabricacao: troca.dados.ano_fabricacao ?? "", ano_modelo: troca.dados.ano_modelo ?? "", cor: troca.dados.cor ?? "",
           valor_fipe: troca.dados.valor_fipe ?? null, selo: troca.selo }]
      : [],
  };
  return (
    <>
      <Cabecalho titulo="Novo orçamento" voltar="/orcamentos" />
      <Conteudo className="max-w-3xl">
        <FormOrcamento carros={carros} clientes={clientes} taxas={cfg.taxas} podeConsultar={pode(usuario.papel, "placa.consultar")} valores={valores} />
      </Conteudo>
    </>
  );
}
