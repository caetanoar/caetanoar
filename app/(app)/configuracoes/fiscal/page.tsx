import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { situacaoProvedor } from "@/lib/integracoes/fiscal";
import { Cabecalho, Conteudo } from "@/components/app/cabecalho";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alerta } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { FormConfigFiscal } from "./form-config-fiscal";

export default async function ConfigFiscal() {
  await exigirPermissao("fiscal.configurar");
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("configuracoes_fiscais").select("*").single();
  const p = situacaoProvedor();
  return (
    <>
      <Cabecalho titulo="Configuração fiscal" voltar="/configuracoes" />
      <Conteudo className="flex max-w-3xl flex-col gap-4">
        <Card>
          <CardHeader><CardTitle>Provedor de emissão</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <strong>{p.nome}</strong>
              <Badge variant={p.simulado ? "warning" : p.configurado ? "success" : "destructive"}>{p.simulado ? "simulado" : p.configurado ? "credenciais ok" : "sem credenciais"}</Badge>
              <Badge variant="outline">{p.ambiente}</Badge>
            </p>
            <p className="text-muted-foreground">
              O provedor é definido pelas variáveis de ambiente <code>FISCAL_PROVIDER</code> (mock, focusnfe ou nfeio), <code>FISCAL_API_TOKEN</code> e <code>FISCAL_AMBIENTE</code>. Nenhum segredo fica guardado no banco.
            </p>
          </CardContent>
        </Card>
        <Alerta variante="aviso" titulo="Valide com o contador">
          CFOP, CST/CSOSN e natureza da operação mudam conforme o regime e o tipo de venda (carro próprio, consignado, devolução ao dono). Os campos ficam em branco até o contador confirmar.
        </Alerta>
        {data && <FormConfigFiscal config={data} />}
      </Conteudo>
    </>
  );
}
