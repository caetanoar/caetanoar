import { CircleAlert, CircleCheck, CircleDashed, Info, FileSearch } from "lucide-react";
import { VERIFICACOES, type ChaveVerificacao } from "@/lib/integracoes/consulta-veicular/tipos";
import { VERMELHAS, AVISO_BASE, fraseNadaEncontrado, itensNaoVerificados } from "@/lib/consulta-veicular/regras";
import type { ConsultaSalva } from "@/lib/consulta-veicular/consultas";
import { formatarDataHora } from "@/lib/format/data";
import { formatarMoeda } from "@/lib/format/moeda";
import { formatarAno, COMBUSTIVEIS } from "@/lib/format/veiculo";
import { ListaDados } from "@/components/app/lista-dados";
import { Badge } from "@/components/ui/badge";
import { Alerta } from "@/components/ui/misc";
import { SeloConsulta } from "./selo";

/** Resultado de uma consulta, com cada item verificado, encontrado ou não verificado. */
export function ResultadoConsulta({ c, temLaudo }: { c: ConsultaSalva; temLaudo?: boolean | null }) {
  const d = c.dados;
  const naoVerificados = itensNaoVerificados(c.verificacoes);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SeloConsulta selo={c.status === "encontrado" ? c.selo : null} />
        {c.simulado && <Badge variant="muted">SIMULADO</Badge>}
      </div>
      <p className="text-xs text-muted-foreground">
        Fonte: {c.provedor} · consultado em {formatarDataHora(c.consultado_em)}{c.usuario ? ` por ${c.usuario}` : ""} · vale até {formatarDataHora(c.expira_em)}
      </p>

      {c.status === "nao_encontrado" && (
        <Alerta variante="aviso" titulo="Placa não encontrada na base do provedor">
          Isso não quer dizer nada sobre o carro: confira a placa e, se estiver certa, peça um laudo cautelar.
        </Alerta>
      )}

      {c.status === "encontrado" && (
        <>
          <ListaDados
            itens={[
              { rotulo: "Veículo", valor: [d.marca, d.modelo, d.versao].filter(Boolean).join(" ") || "—", largo: true },
              { rotulo: "Ano", valor: formatarAno(d.ano_fabricacao, d.ano_modelo) },
              { rotulo: "Cor", valor: d.cor },
              { rotulo: "Combustível", valor: d.combustivel ? (COMBUSTIVEIS[d.combustivel as keyof typeof COMBUSTIVEIS] ?? d.combustivel) : null },
              { rotulo: "Município/UF", valor: [d.municipio, d.uf].filter(Boolean).join("/") || null },
              { rotulo: "Chassi (como veio do provedor)", valor: d.chassi && <span className="font-mono text-xs">{d.chassi}</span> },
              { rotulo: "FIPE", valor: d.valor_fipe ? `${formatarMoeda(d.valor_fipe)}${d.codigo_fipe ? ` · ${d.codigo_fipe}` : ""}` : null },
            ]}
          />
          <ul className="flex flex-col divide-y rounded-lg border">
            {(Object.keys(VERIFICACOES) as ChaveVerificacao[]).map((k) => {
              const v = c.verificacoes[k] ?? { estado: "nao_verificado" as const };
              const grave = VERMELHAS.includes(k);
              return (
                <li key={k} className="flex items-start gap-2.5 px-3 py-2.5 text-sm">
                  {v.estado === "encontrado" ? (
                    <CircleAlert className={grave ? "mt-0.5 size-4 shrink-0 text-destructive" : "mt-0.5 size-4 shrink-0 text-warning"} />
                  ) : v.estado === "nada_encontrado" ? (
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />
                  ) : (
                    <CircleDashed className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{VERIFICACOES[k]}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.estado === "encontrado"
                        ? `Registro encontrado${v.detalhe ? `: ${v.detalhe}` : ""}${v.valor ? ` (${formatarMoeda(v.valor)})` : ""}`
                        : v.estado === "nada_encontrado"
                          ? "Nenhum registro encontrado nesta consulta"
                          : "Não verificado por este provedor"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          {c.selo === "verde" && <p className="text-sm font-medium">{fraseNadaEncontrado(c.consultado_em, c.provedor)}</p>}
          {naoVerificados.length > 0 && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <CircleDashed className="mt-0.5 size-3.5 shrink-0" /> Não verificado nesta consulta: {naoVerificados.join(", ")}.
            </p>
          )}
        </>
      )}

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" /> {AVISO_BASE}</p>
      {!temLaudo && (
        <Alerta variante="info" titulo="Sugestão: laudo cautelar">
          <span className="flex items-start gap-1.5"><FileSearch className="mt-0.5 size-4 shrink-0" /> Não há laudo cautelar anexado. Um laudo independente confere estrutura, chassi e motor, o que a consulta de base de dados não faz.</span>
        </Alerta>
      )}
    </div>
  );
}
