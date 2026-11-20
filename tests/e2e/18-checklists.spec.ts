import { test, expect } from "@playwright/test";
import { entrar, tela } from "./helpers";

const L = "ABCDEFGHJKLMNPRSTUVWXYZ";
const rnd = (n: number) => Math.floor(Math.random() * n);
const placa = `${L[rnd(23)]}${L[rnd(23)]}${L[rnd(23)]}${rnd(10)}${L[rnd(23)]}${rnd(10)}3`;
const item = `E2E Higienização ${Date.now().toString(36).slice(-5)}`;

test.describe.configure({ mode: "serial" });

test("dono adiciona item ao modelo de preparação e reordena", async ({ page }) => {
  await entrar(page, "dono");
  await page.goto("/configuracoes");
  await page.getByRole("link", { name: /Checklists/ }).click();
  await expect(page).toHaveURL(/\/configuracoes\/checklists/);
  await page.locator("#item-novo-preparacao").fill(item);
  await page.locator("#prazo-novo-preparacao").fill("2");
  await page.locator("form", { has: page.locator("#item-novo-preparacao") }).getByRole("button", { name: "Adicionar" }).click();
  await expect(page.getByText("Item adicionado.")).toBeVisible();
  await expect(page.getByText(item)).toBeVisible();
  // Recém-criado vai para o fim; "Subir" troca com o anterior
  await page.getByRole("button", { name: `Subir ${item}` }).click();
  await expect(page.getByRole("button", { name: `Descer ${item}` })).toBeEnabled();
  await tela(page, "h0-config-checklists");
});

test("carro novo em preparação já vem com o item e o prazo", async ({ page }) => {
  await entrar(page, "gerente");
  const campo = page.getByRole("search", { name: "Consultar placa" }).filter({ visible: true }).getByLabel("Placa do carro");
  await campo.fill(placa);
  await campo.press("Enter");
  await page.getByRole("link", { name: "Cadastrar como próprio" }).click();
  await page.getByLabel("Preço anunciado", { exact: true }).fill("4000000");
  await page.getByRole("button", { name: "Cadastrar veículo" }).click();
  await expect(page).toHaveURL(/\/estoque\/[0-9a-f-]{36}/);
  const carro = page.url().match(/estoque\/([0-9a-f-]{36})/)![1];
  await page.goto(`/preparacao/${carro}`);
  await expect(page.getByRole("checkbox", { name: item })).toBeVisible();
});

test("dono exclui o item (checklists já criados não mudam)", async ({ page }) => {
  await entrar(page, "dono");
  await page.goto("/configuracoes/checklists");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: `Excluir ${item}` }).click();
  await expect(page.getByText("Item excluído.")).toBeVisible();
  await expect(page.getByText(item)).toHaveCount(0);
});
