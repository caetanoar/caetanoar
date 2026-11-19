/* eslint-disable @next/next/no-img-element -- fotos já otimizadas no envio */
import Link from "next/link";
import { Car, MessageCircle, CalendarClock, Gauge } from "lucide-react";
import { exigirPermissao } from "@/lib/auth/sessao";
import { pode } from "@/lib/auth/permissoes";
import { criarClienteServidor } from "@/lib/supabase/server";
import { urlFoto } from "@/lib/estoque/consultas";
import { STATUS_VEICULO, TIPO_VEICULO, nomeVeiculo } from "@/lib/estoque/rotulos";
import { formatarMoeda, parseMoeda } from "@/lib/format/moeda";
import { formatarKm, formatarAno, CAMBIOS } from "@/lib/format/veiculo";
import { linkWhatsApp, mensagemVeiculo } from "@/lib/whatsapp";
import { normalizarTexto } from "@/lib/utils";
import { Cabecalho, Conteudo, Vazio } from "@/components/app/cabecalho";
import { Busca, Chips } from "@/components/cadastros/busca";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FiltrosEstoque } from "./filtros";
import { BotaoNovoVeiculo } from "./botao-novo";
import type { Database } from "@/lib/supabase/database.types";

type Filtros = {
  q?: string;
  tipo?: string;
  status?: string;
  marca?: string;
  cambio?: string;
  ano_min?: string;
  ano_max?: string;
  preco_min?: string;
  preco_max?: string;
  ordem?: string;
};
type StatusV = Database["public"]["Enums"]["status_veiculo"];

const EM_ESTOQUE: StatusV[] = ["em_preparacao", "disponivel", "reservado"];

export default async function Estoque({ searchParams }: { searchParams: Promise<Filtros> }) {
  const usuario = await exigirPermissao("estoque");
  const gestor = pode(usuario.papel, "estoque.gerenciar");
  const f = await searchParams;
  const supabase = await criarClienteServidor();

  let q = supabase
    .from("v_veiculos")
    .select("id, tipo, status, marca, modelo, versao, motor, ano_fabricacao, ano_modelo, cor, km, cambio, preco_anunciado, preco_negociavel, placa, dias_em_estoque, foto_capa")
    .limit(500);

  if (f.status === "todos") {
    // sem filtro
  } else if (f.status && f.status in STATUS_VEICULO) {
    q = q.eq("status", f.status as StatusV);
  } else {
    q = q.in("status", EM_ESTOQUE);
  }
  if (f.tipo === "proprio" || f.tipo === "consignado") q = q.eq("tipo", f.tipo);
  if (f.marca) q = q.eq("marca", f.marca);
  if (f.cambio && f.cambio in CAMBIOS) q = q.eq("cambio", f.cambio as keyof typeof CAMBIOS);
  if (f.ano_min) q = q.gte("ano_modelo", Number(f.ano_min));
  if (f.ano_max) q = q.lte("ano_modelo", Number(f.ano_max));
  const pmin = parseMoeda(f.preco_min);
  const pmax = parseMoeda(f.preco_max);
  if (pmin) q = q.gte("preco_anunciado", pmin);
  if (pmax) q = q.lte("preco_anunciado", pmax);

  switch (f.ordem) {
    case "preco_asc": q = q.order("preco_anunciado", { ascending: true, nullsFirst: false }); break;
    case "preco_desc": q = q.order("preco_anunciado", { ascending: false, nullsFirst: false }); break;
    case "ano_desc": q = q.order("ano_modelo", { ascending: false, nullsFirst: false }); break;
    case "parados": q = q.order("data_entrada", { ascending: true }); break;
    default: q = q.order("data_entrada", { ascending: false });
  }

  const [{ data }, { data: marcasDb }, { data: config }] = await Promise.all([
    q,
    supabase.from("veiculos").select("marca").in("status", EM_ESTOQUE),
    supabase.from("configuracoes").select("whatsapp_numero, estoque_parado_dias").single(),
  ]);
  const termo = normalizarTexto(f.q);
  const lista = (data ?? []).filter(
    (v) => !termo || normalizarTexto(`${v.marca} ${v.modelo} ${v.versao ?? ""} ${v.motor ?? ""} ${v.placa ?? ""} ${v.cor ?? ""} ${v.ano_modelo ?? ""}`).includes(termo),
  );
  const marcas = [...new Set((marcasDb ?? []).map((m) => m.marca))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const parado = config?.estoque_parado_dias ?? 45;
  const totalAnunciado = lista.reduce((s, v) => s + Number(v.preco_anunciado ?? 0), 0);

  return (
    <>
      <Cabecalho
        titulo="Estoque"
        subtitulo={`${lista.length} carro(s) · ${formatarMoeda(totalAnunciado)} anunciados`}
        acoes={gestor && <BotaoNovoVeiculo />}
      />
      <Conteudo className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="flex-1"><Busca placeholder="Buscar marca, modelo, placa…" /></div>
          <FiltrosEstoque marcas={marcas} />
        </div>
        <Chips
          parametro="tipo"
          todos="Todos"
          opcoes={[
            { valor: "proprio", rotulo: "Próprios" },
            { valor: "consignado", rotulo: "Consignados" },
          ]}
        />
        {lista.length === 0 ? (
          <Vazio icone={Car} titulo="Nenhum carro encontrado">
            {gestor ? <Link href="/estoque/novo" className="text-primary hover:underline">Cadastrar veículo</Link> : "Ajuste os filtros da busca."}
          </Vazio>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {lista.map((v) => {
              const st = STATUS_VEICULO[v.status!];
              const nome = nomeVeiculo({ marca: v.marca!, modelo: v.modelo!, versao: v.versao });
              const wa = linkWhatsApp(config?.whatsapp_numero ?? "5537991193815", mensagemVeiculo({ ...v, marca: v.marca!, modelo: v.modelo! }));
              const foto = urlFoto(v.foto_capa);
              return (
                <li key={v.id} className="overflow-hidden rounded-xl border bg-card shadow-xs">
                  <Link href={`/estoque/${v.id}`} className="block">
                    <div className="relative aspect-[16/10] bg-muted">
                      {foto ? (
                        <img src={foto} alt={nome} loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground"><Car className="size-12" /></div>
                      )}
                      <div className="absolute top-2 left-2 flex gap-1.5">
                        <Badge variant={st.variante} className="bg-card/95 shadow-sm">{st.rotulo}</Badge>
                        <Badge variant="outline" className="bg-card/95 shadow-sm">{TIPO_VEICULO[v.tipo!]}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 p-3 pb-2">
                      <p className="line-clamp-1 font-semibold">{nome}</p>
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{formatarAno(v.ano_fabricacao, v.ano_modelo)}</span>
                        {v.km !== null && <span className="flex items-center gap-1"><Gauge className="size-3" />{formatarKm(v.km)}</span>}
                        {v.cambio && <span>{CAMBIOS[v.cambio]}</span>}
                        <span className={`flex items-center gap-1 ${(v.dias_em_estoque ?? 0) > parado ? "font-medium text-destructive" : ""}`}>
                          <CalendarClock className="size-3" />{v.dias_em_estoque}d
                        </span>
                      </p>
                      <p className="numero text-lg font-bold text-primary">{formatarMoeda(v.preco_anunciado)}</p>
                    </div>
                  </Link>
                  {wa && (v.status === "disponivel" || v.status === "reservado" || v.status === "em_preparacao") && (
                    <div className="px-3 pb-3">
                      <Button asChild variant="whatsapp" size="sm" className="w-full">
                        <a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle /> Chamar no WhatsApp</a>
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Conteudo>
    </>
  );
}
