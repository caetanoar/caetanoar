import { test, expect } from "@playwright/test";
import { entrar, tela } from "./helpers";

const L = "ABCDEFGHJKLMNPRSTUVWXYZ";
const rnd = (n: number) => Math.floor(Math.random() * n);
const placa = `${L[rnd(23)]}${L[rnd(23)]}${L[rnd(23)]}${rnd(10)}${L[rnd(23)]}${rnd(10)}3`;
// PNG 1x1 válido (a foto do teste)
const foto = {
  name: "lateral.png",
  mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64"),
};
const documento = { name: "atpv.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% ATPV-e (teste)\n%%EOF\n") };
let carro = "";

test.describe.configure({ mode: "serial" });

test("gerente cadastra carro próprio (entra em preparação) e lança um custo de mecânica", async ({ page }) => {
  await entrar(page, "gerente");
  const campo = page.getByRole("search", { name: "Consultar placa" }).filter({ visible: true }).getByLabel("Placa do carro");
  await campo.fill(placa);
  await campo.press("Enter");
  await page.getByRole("link", { name: "Cadastrar como próprio" }).click();
  await page.getByLabel("Preço anunciado", { exact: true }).fill("5500000");
  await page.getByRole("button", { name: "Cadastrar veículo" }).click();
  await expect(page).toHaveURL(/\/estoque\/[0-9a-f-]{36}/);
  carro = page.url().match(/estoque\/([0-9a-f-]{36})/)![1];

  await page.goto(`/preparacao/${carro}`);
  await page.getByLabel(/^Tipo/).selectOption("mecanica");
  await page.getByLabel(/^Valor/).fill("50000");
  await page.getByLabel("Descrição", { exact: true }).fill("Troca de pastilhas (gerente)");
  await page.getByRole("button", { name: "Lançar custo" }).click();
  await expect(page.getByText("Custo lançado.")).toBeVisible();
});

test("preparador: lista de preparação, checklist, foto e custo (vê só o que lançou)", async ({ page }) => {
  await entrar(page, "preparador");
  await expect(page).toHaveURL(/\/preparacao$/);
  await expect(page.getByRole("navigation", { name: "Navegação principal" }).getByRole("link", { name: "Preparação" })).toBeVisible();
  await page.locator(`a[href="/preparacao/${carro}"]`).click();
  await expect(page.getByText("Checklist de preparação")).toBeVisible();

  await page.getByRole("checkbox", { name: "Lavagem" }).click();
  await expect(page.getByText(/1 de \d+ concluído\(s\)/)).toBeVisible();

  await page.getByLabel("Fotos do carro").setInputFiles(foto);
  await expect(page.getByText("Foto enviada.")).toBeVisible();
  await expect(page.getByRole("img", { name: "Foto do carro" })).toHaveCount(1);

  await page.getByLabel(/^Tipo/).selectOption("lavagem");
  await page.getByLabel(/^Valor/).fill("8000");
  await page.getByLabel("Descrição", { exact: true }).fill("Lavagem completa");
  await page.getByRole("button", { name: "Lançar custo" }).click();
  await expect(page.getByText("Custo lançado.")).toBeVisible();
  await expect(page.getByText("Custos que eu lancei")).toBeVisible();
  await expect(page.getByText(/Lavagem completa/)).toBeVisible();
  await expect(page.getByText(/Troca de pastilhas/)).toHaveCount(0);
  await expect(page.getByText(/R\$\s?80,00/).first()).toBeVisible();
  await tela(page, "g0-preparacao-carro");

  await page.goto("/preparacao");
  await expect(page.locator(`a[href="/preparacao/${carro}"]`)).toContainText("1/");
  await tela(page, "g1-preparacao-lista");
});

test("gerente vê os dois custos com quem lançou", async ({ page }) => {
  await entrar(page, "gerente");
  await page.goto(`/preparacao/${carro}`);
  await expect(page.getByText(/Troca de pastilhas/)).toBeVisible();
  await expect(page.getByText(/lançado por Preparador Teste/)).toBeVisible();
  await expect(page.getByText(/R\$\s?580,00/)).toBeVisible();
});

test("administrativo: documentação da venda fechada, checklist e anexo da ATPV-e", async ({ page }) => {
  await entrar(page, "administrativo");
  await expect(page).toHaveURL(/\/documentacao$/);
  const primeira = page.locator('a[href^="/documentacao/"]').first();
  await expect(primeira).toBeVisible();
  await tela(page, "g2-documentacao-lista");
  await primeira.click();
  await expect(page.getByText("Checklist de transferência")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Comprador" })).toBeVisible();
  await expect(page.getByText(/Lucro|Custo de compra|Comissão/)).toHaveCount(0);

  const item = page.getByRole("checkbox", { name: "CRLV" });
  if (!(await item.isChecked())) {
    await item.click();
    await expect(page.getByText(/Feito por|concluído\(s\)/).first()).toBeVisible();
  }
  await page.getByLabel("Tipo de arquivo").selectOption("atpv");
  await page.getByLabel("Escolher arquivo").setInputFiles(documento);
  await expect(page.getByText("Arquivo anexado.").first()).toBeVisible();
  await expect(page.getByText("ATPV-e ·").first()).toBeVisible();
  await tela(page, "g3-documentacao-venda");

  // Continua sem acesso a vendas, financeiro e preparação
  for (const rota of ["/vendas", "/financeiro", "/preparacao"]) {
    await page.goto(rota);
    await expect(page).toHaveURL(/sem-acesso/);
  }
});
