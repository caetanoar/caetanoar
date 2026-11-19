import { test, expect } from "@playwright/test";
import { entrar, tela } from "./helpers";

test("dono define metas e vê o painel gerencial", async ({ page }) => {
  await entrar(page, "dono");
  await page.goto("/configuracoes/metas");
  await page.getByLabel("Faturamento").first().fill("50000000");
  await page.getByLabel("Lucro").first().fill("6000000");
  await page.getByLabel("Número de vendas").first().fill("8");
  // Vendedor Um: 3 vendas
  await page.locator('input[name="qtd_a0000000-0000-4000-8000-000000000003"]').fill("3");
  await page.getByRole("button", { name: "Salvar metas" }).click();
  await expect(page.getByText("Metas salvas.")).toBeVisible();

  await page.goto("/painel");
  await expect(page.getByText("Saldo projetado")).toBeVisible();
  await expect(page.getByText("Meta de faturamento")).toBeVisible();
  await tela(page, "80-painel-dono");

  await page.goto("/dashboard");
  await expect(page.getByText("Meta da loja")).toBeVisible();
  await expect(page.getByText("Valor vendido nos últimos 6 meses").first()).toBeVisible();
  await tela(page, "81-dashboard-gestao");
});

test("vendedor vê só a própria meta, sem lucro", async ({ page }) => {
  await entrar(page, "vendedor1");
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Minha meta" })).toBeVisible();
  await expect(page.getByText(/de 3/)).toBeVisible();
  await expect(page.getByText("Lucro")).toHaveCount(0);
  await tela(page, "82-meta-vendedor");
  await page.goto("/painel");
  await expect(page).toHaveURL(/sem-acesso/);
});
