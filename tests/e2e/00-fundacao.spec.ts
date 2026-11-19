import { test, expect } from "@playwright/test";
import { entrar, tela } from "./helpers";

test("login com senha errada mostra erro", async ({ page }) => {
  await page.goto("/login");
  await tela(page, "00-login");
  await page.getByLabel("E-mail").fill("arthur@caetanoauto.local");
  await page.getByLabel("Senha").fill("errada");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
});

test("dono entra no painel e acessa configurações", async ({ page }) => {
  await entrar(page, "dono");
  await expect(page).toHaveURL(/\/painel/);
  await page.getByRole("button", { name: "Mais" }).click();
  await expect(page.getByRole("link", { name: "Configurações" })).toBeVisible();
  await tela(page, "01-menu-mais-dono");
  await page.getByRole("link", { name: "Configurações" }).click();
  await expect(page.getByRole("heading", { name: "Configurações" })).toBeVisible();

  await page.goto("/configuracoes/loja");
  const campo = page.getByLabel("Avisar garantias que vencem em (dias)");
  const atual = Number(await campo.inputValue());
  await campo.fill(String(atual === 15 ? 16 : 15));
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Configurações salvas.")).toBeVisible();
  await tela(page, "02-config-loja");

  await page.goto("/configuracoes/usuarios");
  await expect(page.getByText("vendedor1@caetanoauto.local")).toBeVisible();
  await tela(page, "03-usuarios");

  await page.goto("/configuracoes/auditoria");
  await expect(page.locator("summary").filter({ hasText: "Alterou" }).first()).toBeVisible();
  await page.locator("summary").filter({ hasText: "Alterou" }).first().click();
  await tela(page, "04-auditoria");
});

test("vendedor não acessa configurações", async ({ page }) => {
  await entrar(page, "vendedor1");
  await expect(page).toHaveURL(/\/estoque/);
  await page.goto("/configuracoes");
  await expect(page).toHaveURL(/\/sem-acesso/);
  await expect(page.getByText("Sem permissão")).toBeVisible();
});

test("gerente cai no dashboard e não vê configurações no menu", async ({ page }) => {
  await entrar(page, "gerente");
  await expect(page).toHaveURL(/\/dashboard/);
  await page.getByRole("button", { name: "Mais" }).click();
  await expect(page.getByRole("link", { name: "Financeiro" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Configurações" })).toHaveCount(0);
});
