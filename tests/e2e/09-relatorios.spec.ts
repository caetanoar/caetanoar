import { test, expect } from "@playwright/test";
import { entrar, tela } from "./helpers";

const ano = new Date().getFullYear();

test("gerente filtra relatórios por período e baixa CSV e PDF", async ({ page }) => {
  await entrar(page, "gerente");
  await page.goto("/relatorios");
  await expect(page.getByRole("link", { name: /Vendedores/ })).toBeVisible();
  await tela(page, "90-relatorios");

  await page.getByRole("link", { name: /^Vendas Vendas fechadas/ }).click();
  await page.getByRole("link", { name: "Este ano" }).click();
  await expect(page).toHaveURL(new RegExp(`de=${ano}-01-01`));
  await expect(page.getByText("Valor vendido")).toBeVisible();
  await tela(page, "91-relatorio-vendas");

  // CSV: BOM + ";" + cabeçalho em português
  const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Baixar CSV" }).click()]);
  expect(csv.suggestedFilename()).toMatch(/^relatorio-vendas-\d{4}-\d{2}-\d{2}-a-\d{4}-\d{2}-\d{2}\.csv$/);
  const texto = await (await csv.createReadStream()).toArray().then((b) => Buffer.concat(b).toString("utf8"));
  expect(texto.charCodeAt(0)).toBe(0xfeff);
  expect(texto).toContain("Venda;Data;Veículo;Tipo;Cliente;Vendedor");

  // PDF
  const [pdf] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Baixar PDF" }).click()]);
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  const bytes = await (await pdf.createReadStream()).toArray().then((b) => Buffer.concat(b));
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");

  // Período livre em dd/mm/aaaa
  await page.goto("/relatorios/financeiro");
  await page.getByLabel("Data inicial").fill(`01/01/${ano}`);
  await page.getByLabel("Data final").fill(`31/12/${ano}`);
  await page.getByRole("button", { name: "Aplicar período" }).click();
  await expect(page).toHaveURL(new RegExp(`de=${ano}-01-01&ate=${ano}-12-31`));
  await expect(page.getByText("Contador: comissões de consignação")).toBeVisible();
  await tela(page, "92-relatorio-financeiro");

  // Carros: os consignados da carga inicial aparecem na tabela
  await page.goto(`/relatorios/carros?de=${ano}-01-01&ate=${ano}-12-31`);
  await expect(page.getByRole("columnheader", { name: "Dias" })).toBeVisible();
  await expect(page.getByRole("cell", { name: /T-Cross/ })).toBeVisible();
  await expect(page.getByRole("cell", { name: /Ka/ }).first()).toBeVisible();
  await tela(page, "93-relatorio-carros");

  for (const t of ["clientes", "fiscal", "vendedores"]) {
    const r = await page.goto(`/relatorios/${t}?de=${ano}-01-01&ate=${ano}-12-31`);
    expect(r?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Relatório");
  }
});

test("vendedor não acessa relatórios nem a exportação", async ({ page }) => {
  await entrar(page, "vendedor1");
  await page.goto("/relatorios/financeiro");
  await expect(page).toHaveURL(/sem-acesso/);
  const r = await page.request.get(`/relatorios/financeiro/exportar?formato=csv`);
  expect(r.status()).toBe(403);
});
