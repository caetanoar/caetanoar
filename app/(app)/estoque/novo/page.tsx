import { exigirPermissao } from "@/lib/auth/sessao";
import { opcoesCadastro } from "@/lib/estoque/consultas";
import { consultaPorId } from "@/lib/consulta-veicular/consultas";
import { COMBUSTIVEIS } from "@/lib/format/veiculo";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { Alerta } from "@/components/ui/misc";
import { FormVeiculo } from "../form-veiculo";

export default async function NovoVeiculo({ searchParams }: { searchParams: Promise<{ tipo?: string; consulta?: string }> }) {
  const usuario = await exigirPermissao("estoque.gerenciar");
  const { tipo, consulta: consultaId } = await searchParams;
  const opcoes = await opcoesCadastro();
  const consignado = tipo === "consignado";
  // Um clique a partir da consulta por placa: o cadastro já vem preenchido.
  const c = consultaId && /^[0-9a-f-]{36}$/i.test(consultaId) ? await consultaPorId(consultaId) : null;
  const d = c?.status === "encontrado" ? c.dados : null;
  const valores = {
    tipo: consignado ? "consignado" : "proprio",
    ...(c && d
      ? {
          consulta_id: c.id,
          placa: c.placa,
          marca: d.marca,
          modelo: d.modelo,
          versao: d.versao,
          ano_fabricacao: d.ano_fabricacao,
          ano_modelo: d.ano_modelo,
          cor: d.cor,
          combustivel: d.combustivel && d.combustivel in COMBUSTIVEIS ? d.combustivel : null,
          codigo_fipe: d.codigo_fipe,
          valor_fipe: d.valor_fipe,
          fipe_referencia: d.fipe_referencia,
          observacoes_internas: d.chassi ? `Chassi como veio na consulta de placa (${c.provedor}): ${d.chassi}` : null,
        }
      : {}),
  };
  return (
    <>
      <Cabecalho titulo="Cadastrar veículo" voltar={c ? `/placa/${c.placa}` : "/estoque"} />
      <Conteudo className="flex max-w-3xl flex-col gap-4">
        {c && d && (
          <Alerta variante="info">Dados preenchidos a partir da consulta da placa{c.simulado ? " (provedor simulado)" : ""}. Confira tudo e complete o chassi pelo documento do carro.</Alerta>
        )}
        <FormVeiculo valores={valores} {...opcoes} eDono={usuario.papel === "dono"} />
      </Conteudo>
    </>
  );
}
