/**
 * Matriz de permissões usada pela INTERFACE (esconder menus e botões).
 * Quem garante o acesso de verdade é a RLS no banco — isto aqui é só UX.
 */
export type Papel = "dono" | "gerente" | "vendedor" | "atendimento" | "preparador" | "administrativo";

export const PAPEIS: Papel[] = ["dono", "gerente", "vendedor", "atendimento", "preparador", "administrativo"];

export type Recurso =
  | "painel"
  | "dashboard"
  | "estoque"
  | "estoque.gerenciar"
  | "estoque.sigilo"
  | "clientes"
  | "clientes.criar"
  | "clientes.gestao"
  | "clientes.revelar"
  | "fornecedores"
  | "consignantes"
  | "parceiros"
  | "vendas"
  | "vendas.fechar"
  | "garantias"
  | "garantias.ajustar"
  | "financeiro"
  | "comissoes"
  | "comissoes.regras"
  | "minhas-comissoes"
  | "metas.definir"
  | "fiscal"
  | "fiscal.configurar"
  | "relatorios"
  | "configuracoes"
  | "auditoria"
  | "tarefas"
  | "preparacao"
  | "documentacao"
  | "placa"
  | "placa.consultar"
  | "consultas.painel"
  | "orcamentos"
  | "orcamentos.aprovar";

const TODOS: Papel[] = PAPEIS;

const MATRIZ: Record<Recurso, Papel[]> = {
  painel: ["dono"],
  dashboard: ["dono", "gerente", "vendedor"],
  estoque: TODOS,
  "estoque.gerenciar": ["dono", "gerente"],
  "estoque.sigilo": ["dono", "gerente"],
  clientes: ["dono", "gerente", "vendedor", "atendimento"],
  "clientes.criar": ["dono", "gerente", "vendedor"],
  "clientes.gestao": ["dono", "gerente"],
  "clientes.revelar": ["dono", "gerente", "vendedor", "administrativo"],
  fornecedores: ["dono", "gerente"],
  consignantes: ["dono", "gerente"],
  parceiros: ["dono", "gerente"],
  vendas: ["dono", "gerente", "vendedor"],
  "vendas.fechar": ["dono", "gerente"],
  garantias: ["dono", "gerente", "atendimento"],
  "garantias.ajustar": ["dono", "gerente"],
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
  tarefas: TODOS,
  preparacao: ["dono", "gerente", "preparador"],
  documentacao: ["dono", "gerente", "administrativo"],
  placa: TODOS,
  "placa.consultar": ["dono", "gerente", "vendedor", "administrativo"],
  "consultas.painel": ["dono", "gerente"],
  orcamentos: ["dono", "gerente", "vendedor"],
  "orcamentos.aprovar": ["dono", "gerente"],
};

export function pode(papel: Papel | null | undefined, recurso: Recurso): boolean {
  return !!papel && MATRIZ[recurso].includes(papel);
}

export const NOME_PAPEL: Record<Papel, string> = {
  dono: "Dono",
  gerente: "Gerente",
  vendedor: "Vendedor",
  atendimento: "Atendimento / pós-venda",
  preparador: "Preparador",
  administrativo: "Administrativo / despachante",
};

/** Página inicial de cada perfil. */
export function paginaInicial(papel: Papel): string {
  if (papel === "dono") return "/painel";
  if (papel === "gerente") return "/dashboard";
  if (papel === "vendedor") return "/estoque";
  if (papel === "preparador") return "/preparacao";
  if (papel === "administrativo") return "/documentacao";
  return "/tarefas";
}
