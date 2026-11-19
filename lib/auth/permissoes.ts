/**
 * Matriz de permissões usada pela INTERFACE (esconder menus e botões).
 * Quem garante o acesso de verdade é a RLS no banco — isto aqui é só UX.
 */
export type Papel = "dono" | "gerente" | "vendedor";

export type Recurso =
  | "painel"
  | "dashboard"
  | "estoque"
  | "estoque.gerenciar"
  | "estoque.sigilo"
  | "clientes"
  | "fornecedores"
  | "consignantes"
  | "parceiros"
  | "vendas"
  | "vendas.fechar"
  | "garantias"
  | "financeiro"
  | "comissoes"
  | "comissoes.regras"
  | "minhas-comissoes"
  | "metas.definir"
  | "fiscal"
  | "fiscal.configurar"
  | "relatorios"
  | "configuracoes"
  | "auditoria";

const MATRIZ: Record<Recurso, Papel[]> = {
  painel: ["dono"],
  dashboard: ["dono", "gerente", "vendedor"],
  estoque: ["dono", "gerente", "vendedor"],
  "estoque.gerenciar": ["dono", "gerente"],
  "estoque.sigilo": ["dono", "gerente"],
  clientes: ["dono", "gerente", "vendedor"],
  fornecedores: ["dono", "gerente"],
  consignantes: ["dono", "gerente"],
  parceiros: ["dono", "gerente"],
  vendas: ["dono", "gerente", "vendedor"],
  "vendas.fechar": ["dono", "gerente"],
  garantias: ["dono", "gerente"],
  financeiro: ["dono", "gerente"],
  comissoes: ["dono", "gerente"],
  "comissoes.regras": ["dono"],
  "minhas-comissoes": ["vendedor"],
  "metas.definir": ["dono"],
  fiscal: ["dono", "gerente"],
  "fiscal.configurar": ["dono"],
  relatorios: ["dono", "gerente"],
  configuracoes: ["dono"],
  auditoria: ["dono"],
};

export function pode(papel: Papel | null | undefined, recurso: Recurso): boolean {
  return !!papel && MATRIZ[recurso].includes(papel);
}

export const NOME_PAPEL: Record<Papel, string> = {
  dono: "Dono",
  gerente: "Gerente",
  vendedor: "Vendedor",
};

/** Página inicial de cada perfil. */
export function paginaInicial(papel: Papel): string {
  if (papel === "dono") return "/painel";
  if (papel === "gerente") return "/dashboard";
  return "/estoque";
}
