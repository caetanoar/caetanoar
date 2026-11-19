import {
  LayoutDashboard, Gauge, Car, Users, Handshake, Wallet, MoreHorizontal, ShieldCheck, Percent,
  FileText, BarChart3, Settings, Truck, UserRound, Share2, Target, Landmark, Coins,
  type LucideIcon,
} from "lucide-react";
import type { Papel, Recurso } from "@/lib/auth/permissoes";
import { pode } from "@/lib/auth/permissoes";

export type ItemMenu = { href: string; rotulo: string; icone: LucideIcon; recurso: Recurso; grupo: string };

/** Menu completo (aba "Mais"). Cada item aparece só para quem tem permissão. */
export const MENU: ItemMenu[] = [
  { href: "/painel", rotulo: "Painel gerencial", icone: LayoutDashboard, recurso: "painel", grupo: "Visão geral" },
  { href: "/dashboard", rotulo: "Metas e resultados", icone: Gauge, recurso: "dashboard", grupo: "Visão geral" },
  { href: "/estoque", rotulo: "Estoque", icone: Car, recurso: "estoque", grupo: "Vendas" },
  { href: "/clientes", rotulo: "Clientes", icone: Users, recurso: "clientes", grupo: "Vendas" },
  { href: "/vendas", rotulo: "Vendas", icone: Handshake, recurso: "vendas", grupo: "Vendas" },
  { href: "/garantias", rotulo: "Garantias", icone: ShieldCheck, recurso: "garantias", grupo: "Vendas" },
  { href: "/minhas-comissoes", rotulo: "Minhas comissões", icone: Coins, recurso: "minhas-comissoes", grupo: "Vendas" },
  { href: "/consignantes", rotulo: "Consignantes", icone: UserRound, recurso: "consignantes", grupo: "Cadastros" },
  { href: "/fornecedores", rotulo: "Fornecedores", icone: Truck, recurso: "fornecedores", grupo: "Cadastros" },
  { href: "/parceiros", rotulo: "Parceiros", icone: Share2, recurso: "parceiros", grupo: "Cadastros" },
  { href: "/financeiro", rotulo: "Financeiro", icone: Wallet, recurso: "financeiro", grupo: "Gestão" },
  { href: "/financeiro/conciliacao", rotulo: "Conciliação bancária", icone: Landmark, recurso: "financeiro", grupo: "Gestão" },
  { href: "/comissoes", rotulo: "Comissões", icone: Percent, recurso: "comissoes", grupo: "Gestão" },
  { href: "/fiscal", rotulo: "Fiscal (NF-e)", icone: FileText, recurso: "fiscal", grupo: "Gestão" },
  { href: "/relatorios", rotulo: "Relatórios", icone: BarChart3, recurso: "relatorios", grupo: "Gestão" },
  { href: "/configuracoes/metas", rotulo: "Metas", icone: Target, recurso: "metas.definir", grupo: "Gestão" },
  { href: "/configuracoes", rotulo: "Configurações", icone: Settings, recurso: "configuracoes", grupo: "Sistema" },
];

export type ItemBarra = { href: string; rotulo: string; icone: LucideIcon };

/** Barra inferior: 4 atalhos por perfil + "Mais". */
export function itensBarra(papel: Papel): ItemBarra[] {
  const mais = { href: "#mais", rotulo: "Mais", icone: MoreHorizontal };
  if (papel === "dono") {
    return [
      { href: "/painel", rotulo: "Painel", icone: LayoutDashboard },
      { href: "/estoque", rotulo: "Estoque", icone: Car },
      { href: "/vendas", rotulo: "Vendas", icone: Handshake },
      { href: "/financeiro", rotulo: "Financeiro", icone: Wallet },
      mais,
    ];
  }
  if (papel === "gerente") {
    return [
      { href: "/dashboard", rotulo: "Dashboard", icone: Gauge },
      { href: "/estoque", rotulo: "Estoque", icone: Car },
      { href: "/vendas", rotulo: "Vendas", icone: Handshake },
      { href: "/clientes", rotulo: "Clientes", icone: Users },
      mais,
    ];
  }
  return [
    { href: "/estoque", rotulo: "Estoque", icone: Car },
    { href: "/clientes", rotulo: "Clientes", icone: Users },
    { href: "/vendas", rotulo: "Vendas", icone: Handshake },
    { href: "/dashboard", rotulo: "Minha meta", icone: Target },
    mais,
  ];
}

export function menuDoPapel(papel: Papel): ItemMenu[] {
  return MENU.filter((i) => pode(papel, i.recurso));
}
