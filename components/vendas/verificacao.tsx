import { FileDown, ShieldCheck, ShieldAlert, CircleCheck } from "lucide-react";
import type { Papel } from "@/lib/auth/permissoes";
import { pode } from "@/lib/auth/permissoes";
import { NIVEL_VERIFICACAO, type Verificacao } from "@/lib/vendas/verificacao";
import { formatarDataHora } from "@/lib/format/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alerta } from "@/components/ui/misc";
import { ListaAlertas } from "@/components/orcamentos/alertas";
import { BotaoConsulta } from "@/components/consulta/botoes";
import { RegistrarCiencia, LiberarBloqueio, EnviarParaAprovacao, EnviarTermo } from "./verificacao-acoes";

type Props = {
  vendaId: string;
  verif: Verificacao;
  placa: string | null;
  status: "rascunho" | "aguardando_aprovacao";
  usuario: { id: string; papel: Papel };
  vendedorId: string;
};

/** Cartão "Verificação do veículo" da venda em aberto: alertas, consulta, ciência, termo e liberação. */
export function CartaoVerificacao({ vendaId, verif, placa, status, usuario, vendedorId }: Props) {
  const nivel = NIVEL_VERIFICACAO[verif.nivel];
  const responsavel = pode(usuario.papel, "vendas.fechar") || usuario.id === vendedorId;
  const podeConsultar = pode(usuario.papel, "placa.consultar") && !!placa;
  const consultaPendente = verif.bloqueios.some((a) => a.codigo === "sem_consulta" || a.codigo === "consulta_antiga");
  const temImpeditivo = verif.bloqueios.some((a) => a.nivel === "vermelho");

  return (
    <Card className={verif.bloqueios.length ? "border-destructive/50" : verif.precisa_ciencia ? "border-warning/50" : undefined}>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-1.5">
          {verif.pode_fechar ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />} Verificação do veículo
        </CardTitle>
        <Badge variant={nivel.variante}>{nivel.rotulo}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          {verif.consulta
            ? `Consulta da placa em ${formatarDataHora(verif.consulta.consultado_em)} (${verif.consulta.provedor})${verif.consulta.simulado ? " · SIMULADO" : ""}.`
            : placa ? "A placa deste carro ainda não foi consultada." : "Carro sem placa cadastrada."}
        </p>
        <ListaAlertas alertas={verif.alertas} />
        <p className="text-xs text-muted-foreground">Todos os alertas são informados ao comprador; nenhum pode ser ocultado.</p>

        {consultaPendente && podeConsultar && responsavel && <BotaoConsulta placa={placa!} atualizar={!!verif.consulta} />}

        {verif.liberacao && (
          <Alerta variante="aviso" titulo="Venda liberada pelo dono">
            {verif.liberacao.por} em {formatarDataHora(verif.liberacao.em)}: {verif.liberacao.justificativa}
          </Alerta>
        )}
        {verif.bloqueios.length > 0 && (
          usuario.papel === "dono"
            ? <LiberarBloqueio id={vendaId} />
            : <Alerta variante="erro">{temImpeditivo ? "Alerta impeditivo: a venda só segue se o dono liberar, com justificativa." : "Sem consulta válida da placa: faça uma nova consulta ou peça a liberação ao dono."}</Alerta>
        )}

        {verif.precisa_ciencia && (
          <div className="flex flex-col gap-2">
            {verif.ciencia && (
              <p className="flex items-start gap-1.5 text-sm">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />
                <span>Ciência registrada por {verif.ciencia.por} em {formatarDataHora(verif.ciencia.em)}{verif.sem_ciencia.length ? " (antes de alertas novos)" : ""}.</span>
              </p>
            )}
            {verif.sem_ciencia.length > 0 && responsavel && <RegistrarCiencia id={vendaId} />}
            {verif.ciencia && verif.sem_ciencia.length === 0 && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button asChild variant="outline"><a href={`/vendas/${vendaId}/termo-ciencia`} download><FileDown /> Gerar Termo de Ciência (PDF)</a></Button>
                {verif.termo_assinado
                  ? <p className="flex items-center gap-1.5 self-center text-sm text-success"><CircleCheck className="size-4" /> Termo assinado anexado</p>
                  : responsavel && <EnviarTermo id={vendaId} />}
              </div>
            )}
          </div>
        )}

        {verif.pendencias.length > 0 && (
          <Alerta variante="info" titulo="Para seguir com a venda">
            <ul className="list-disc pl-4">{verif.pendencias.map((p) => <li key={p}>{p}</li>)}</ul>
          </Alerta>
        )}
        {status === "rascunho" && verif.pode_aprovar && responsavel && !pode(usuario.papel, "vendas.fechar") && <EnviarParaAprovacao id={vendaId} />}
      </CardContent>
    </Card>
  );
}

/** Venda fechada: o que a verificação registrou no fechamento. */
export function VerificacaoRegistrada({ alertas, em }: { alertas: Verificacao["alertas"]; em: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-1.5"><ShieldCheck className="size-4" /> Verificação no fechamento</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2">
        <ListaAlertas alertas={alertas} />
        <p className="text-xs text-muted-foreground">Registrada em {formatarDataHora(em)}.</p>
      </CardContent>
    </Card>
  );
}
