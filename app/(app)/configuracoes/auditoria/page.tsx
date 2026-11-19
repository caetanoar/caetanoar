import Link from "next/link";
import { History } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { InputData } from "@/components/form/inputs";
import { Button } from "@/components/ui/button";
import { formatarDataHora } from "@/lib/format/data";
import { NOMES_TABELAS, NOMES_ACOES } from "@/lib/nomes-tabelas";

const POR_PAGINA = 30;

type Filtros = { tabela?: string; usuario?: string; registro?: string; de?: string; ate?: string; pagina?: string };

function valorCurto(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
}

export default async function Auditoria({ searchParams }: { searchParams: Promise<Filtros> }) {
  await exigirPermissao("auditoria");
  const f = await searchParams;
  const pagina = Math.max(1, Number(f.pagina) || 1);
  const supabase = await criarClienteServidor();

  let q = supabase
    .from("auditoria")
    .select("id, tabela, registro_id, acao, ator, usuario_id, antes, depois, campos_alterados, criado_em", { count: "exact" })
    .order("criado_em", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
  if (f.tabela) q = q.eq("tabela", f.tabela);
  if (f.usuario) q = q.eq("usuario_id", f.usuario);
  if (f.registro) q = q.eq("registro_id", f.registro);
  if (f.de) q = q.gte("criado_em", `${f.de}T00:00:00-03:00`);
  if (f.ate) q = q.lte("criado_em", `${f.ate}T23:59:59-03:00`);

  const [{ data: registros, count }, { data: usuarios }] = await Promise.all([
    q,
    supabase.from("usuarios").select("id, nome").order("nome"),
  ]);
  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const link = (p: number) => {
    const sp = new URLSearchParams(Object.entries({ ...f, pagina: String(p) }).filter(([, v]) => v) as [string, string][]);
    return `?${sp.toString()}`;
  };

  return (
    <>
      <Cabecalho titulo="Auditoria" subtitulo={`${total.toLocaleString("pt-BR")} registros`} voltar="/configuracoes" />
      <Conteudo className="flex flex-col gap-4">
        <form className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <Select name="tabela" defaultValue={f.tabela ?? ""} aria-label="Tabela">
            <option value="">Todas as tabelas</option>
            {Object.entries(NOMES_TABELAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select name="usuario" defaultValue={f.usuario ?? ""} aria-label="Usuário">
            <option value="">Todos os usuários</option>
            {usuarios?.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </Select>
          <InputData name="de" defaultValue={f.de} aria-label="De" placeholder="De dd/mm/aaaa" />
          <InputData name="ate" defaultValue={f.ate} aria-label="Até" placeholder="Até dd/mm/aaaa" />
          <Button type="submit" variant="outline" className="col-span-2 md:col-span-1">Filtrar</Button>
        </form>

        {!registros?.length ? (
          <Vazio icone={History} titulo="Nenhum registro encontrado" />
        ) : (
          <Card className="divide-y overflow-hidden p-0">
            {registros.map((r) => {
              const campos = r.campos_alterados ?? [];
              const antes = (r.antes ?? {}) as Record<string, unknown>;
              const depois = (r.depois ?? {}) as Record<string, unknown>;
              return (
                <details key={r.id} className="group px-4 py-3">
                  <summary className="flex cursor-pointer list-none flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant={r.acao === "DELETE" ? "destructive" : r.acao === "INSERT" ? "success" : "info"}>
                        {NOMES_ACOES[r.acao] ?? r.acao}
                      </Badge>
                      <span className="font-medium">{NOMES_TABELAS[r.tabela] ?? r.tabela}</span>
                      <span className="text-muted-foreground">por {r.ator ?? "sistema"}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      <span>{formatarDataHora(r.criado_em)}</span>
                      {r.registro_id && <span className="font-mono">#{r.registro_id.slice(0, 8)}</span>}
                      {campos.length > 0 && <span>Campos: {campos.join(", ")}</span>}
                    </div>
                  </summary>
                  <div className="mt-3 overflow-x-auto rounded-lg bg-muted/50 p-3 text-xs">
                    {r.acao === "UPDATE" ? (
                      <table className="w-full">
                        <thead><tr className="text-left text-muted-foreground"><th className="pr-3">Campo</th><th className="pr-3">Antes</th><th>Depois</th></tr></thead>
                        <tbody>
                          {campos.map((c) => (
                            <tr key={c} className="align-top">
                              <td className="pr-3 font-medium">{c}</td>
                              <td className="pr-3 text-destructive">{valorCurto(antes[c])}</td>
                              <td className="text-success">{valorCurto(depois[c])}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <pre className="whitespace-pre-wrap break-all">{JSON.stringify(r.acao === "DELETE" ? antes : depois, null, 2)}</pre>
                    )}
                    {r.registro_id && (
                      <Link className="mt-2 inline-block text-primary hover:underline" href={`?registro=${r.registro_id}`}>
                        Ver todo o histórico deste registro
                      </Link>
                    )}
                  </div>
                </details>
              );
            })}
          </Card>
        )}

        {paginas > 1 && (
          <div className="flex items-center justify-between text-sm">
            <Button asChild variant="outline" size="sm" className={pagina <= 1 ? "pointer-events-none opacity-50" : ""}>
              <Link href={link(pagina - 1)}>Anterior</Link>
            </Button>
            <span className="text-muted-foreground">Página {pagina} de {paginas}</span>
            <Button asChild variant="outline" size="sm" className={pagina >= paginas ? "pointer-events-none opacity-50" : ""}>
              <Link href={link(pagina + 1)}>Próxima</Link>
            </Button>
          </div>
        )}
      </Conteudo>
    </>
  );
}
