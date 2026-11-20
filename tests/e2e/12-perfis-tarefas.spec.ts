import { test, expect } from "@playwright/test";
import { entrar, tela } from "./helpers";

const sufixo = String(Date.now()).slice(-5);
const modelo = `Mobi ${sufixo}`;
const tituloTarefa = `Polir e higienizar ${sufixo}`;
let urlCarro = "";

test("gerente cadastra carro em preparação e passa tarefa ao preparador", async ({ page }) => {
  await entrar(page, "gerente");
  await page.goto("/estoque/novo?tipo=proprio");
  await page.getByLabel(/^Marca/).fill("Fiat");
  await page.getByLabel(/^Modelo/).fill(modelo);
  await page.getByLabel("Ano modelo", { exact: true }).fill("2021");
  await page.getByLabel("Preço anunciado", { exact: true }).fill("5500000");
  await page.getByRole("button", { name: "Cadastrar veículo" }).click();
  await expect(page.getByRole("heading", { name: `Fiat ${modelo}` })).toBeVisible();
  urlCarro = page.url().split("?")[0];

  // Checklist criado automaticamente ao entrar em preparação
  await page.getByRole("link", { name: "Preparação" }).click();
  await expect(page.getByText(/^0 de \d+ concluído\(s\)$/)).toBeVisible();

  // Tarefa para o preparador, com prazo hoje
  await page.getByRole("link", { name: "Dados" }).click();
  await page.getByRole("button", { name: "Tarefa" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel(/^O que fazer/).fill(tituloTarefa);
  const hoje = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(new Date());
  await dlg.getByLabel("Prazo", { exact: true }).fill(hoje);
  await dlg.getByLabel("Responsável", { exact: true }).selectOption({ label: "Preparador Teste" });
  await dlg.getByRole("button", { name: "Criar tarefa" }).click();
  await expect(page.getByText("Tarefa criada.")).toBeVisible();
  await expect(page.getByText(tituloTarefa)).toBeVisible();
});

test("preparador vê a tarefa, marca o checklist e não vê custo nem clientes", async ({ page }) => {
  await entrar(page, "preparador");
  await expect(page).toHaveURL(/\/preparacao/);
  await page.goto("/tarefas");
  await expect(page.getByRole("navigation", { name: "Navegação principal" }).getByLabel(/tarefa\(s\) para hoje ou atrasada\(s\)/)).toBeVisible();
  await expect(page.getByText(tituloTarefa)).toBeVisible();
  await tela(page, "c0-tarefas-preparador");

  await page.goto(`${urlCarro}?aba=preparacao`);
  await page.getByRole("checkbox", { name: "Lavagem" }).click();
  await expect(page.getByText(/^1 de \d+ concluído\(s\)$/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Feito por Preparador Teste/)).toBeVisible();
  await tela(page, "c1-checklist-preparacao");
  await expect(page.getByRole("link", { name: "Custos" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Registrar venda" })).toHaveCount(0);

  await page.goto("/tarefas");
  await page.locator("li", { hasText: tituloTarefa }).getByRole("button", { name: "Concluir" }).click();
  await expect(page.getByText("Tarefa concluída.")).toBeVisible();

  await page.goto("/clientes");
  await expect(page).toHaveURL(/sem-acesso/);
  await page.goto("/financeiro");
  await expect(page).toHaveURL(/sem-acesso/);
});

test("atendimento vê clientes e garantias, sem cadastrar cliente nem revelar CPF", async ({ page }) => {
  await entrar(page, "atendimento");
  const barra = page.getByRole("navigation", { name: "Navegação principal" });
  await expect(barra.getByRole("link", { name: "Garantias" })).toBeVisible();
  await page.goto("/clientes");
  await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Novo" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Revelar" })).toHaveCount(0);
  await page.goto("/garantias");
  await expect(page).not.toHaveURL(/sem-acesso/);
  await tela(page, "c2-garantias-atendimento");
  await page.goto("/vendas");
  await expect(page).toHaveURL(/sem-acesso/);
});

test("administrativo não acessa vendas nem financeiro", async ({ page }) => {
  await entrar(page, "administrativo");
  await expect(page).toHaveURL(/\/documentacao/);
  for (const rota of ["/vendas", "/financeiro", "/clientes"]) {
    await page.goto(rota);
    await expect(page).toHaveURL(/sem-acesso/);
  }
});
