import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { entrar, tela } from "./helpers";

function dv(base: string) {
  let s = 0, p = 2;
  for (let i = base.length - 1; i >= 0; i--) { s += Number(base[i]) * p; p = p === 9 ? 2 : p + 1; }
  const r = s % 11;
  return String(r < 2 ? 0 : 11 - r);
}

/** XML de exemplo com chave, número e chassi únicos (o teste pode rodar várias vezes). */
function xmlUnico() {
  const original = readFileSync(path.resolve("tests/fixtures/nfe-entrada-veiculo.xml"), "utf8");
  const numero = String(Math.floor(Math.random() * 900000) + 100000).padStart(9, "0");
  const base = `3126111667008500015555001${numero}1${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
  const chave = base + dv(base);
  const chassi = `9BGEB69H0RG${String(Math.floor(Math.random() * 900000) + 100000)}`;
  const placa = `RQH${Math.floor(Math.random() * 10)}B${Math.floor(Math.random() * 90) + 10}`;
  return {
    numero: String(Number(numero)),
    chassi,
    xml: original
      .replaceAll("31261116670085000155550010000123451000123456", chave)
      .replace("<nNF>12345</nNF>", `<nNF>${Number(numero)}</nNF>`)
      .replace("9BGEB69H0RG123456", chassi)
      .replace("PLACA RQH2B45", `PLACA ${placa}`),
  };
}

test("gerente importa XML de compra de veículo e o carro entra no estoque", async ({ page }) => {
  const nf = xmlUnico();
  await entrar(page, "gerente");
  await page.goto("/fiscal/importar");
  await page.locator('input[type="file"]').setInputFiles({ name: "nfe.xml", mimeType: "application/xml", buffer: Buffer.from(nf.xml) });
  await expect(page.getByText(`NF-e ${nf.numero}/1`)).toBeVisible();
  await expect(page.getByText("LOCALIZA RENT A CAR SA").first()).toBeVisible();
  await expect(page.getByText(`Chassi ${nf.chassi}`)).toBeVisible();
  await expect(page.getByLabel("Veículo da nota")).toHaveValue(/criar|vincular/);
  await tela(page, "60-importar-xml");
  await page.getByRole("button", { name: "Importar nota" }).click();
  await expect(page.getByRole("heading", { name: `NF-e ${nf.numero}/1` })).toBeVisible();
  await expect(page.getByText("Importada").first()).toBeVisible();
  await tela(page, "61-nota-importada");

  // Carro criado como próprio em preparação, com fornecedor e custo de compra
  await page.getByRole("link", { name: /Chevrolet Onix/ }).click();
  await expect(page.getByText("Em preparação").first()).toBeVisible();
  await expect(page.getByText("R$ 72.500,00").first()).toBeVisible();
  await expect(page.getByText(nf.chassi)).toBeVisible();

  // Conta a pagar da compra gerada automaticamente
  await page.goto("/financeiro/pagar");
  await expect(page.getByText(/Compra: Chevrolet Onix/).first()).toBeVisible();
});

test("XML repetido é recusado", async ({ page }) => {
  await entrar(page, "gerente");
  await page.goto("/fiscal/importar");
  const original = readFileSync(path.resolve("tests/fixtures/nfe-entrada-veiculo.xml"));
  await page.locator('input[type="file"]').setInputFiles({ name: "nfe.xml", mimeType: "application/xml", buffer: original });
  await expect(page.getByText(/NF-e 12345\/1/)).toBeVisible();
  // Primeira vez importa; na segunda o sistema avisa
  if (await page.getByRole("button", { name: "Importar nota" }).isVisible()) {
    await page.getByLabel("Veículo da nota").selectOption("nenhum");
    await page.getByRole("button", { name: "Importar nota" }).click();
    await expect(page.getByRole("heading", { name: "NF-e 12345/1" })).toBeVisible();
    await page.goto("/fiscal/importar");
    await page.locator('input[type="file"]').setInputFiles({ name: "nfe.xml", mimeType: "application/xml", buffer: original });
  }
  await expect(page.getByText("Nota já importada")).toBeVisible();
});

test("emite NF-e simulada de uma venda fechada", async ({ page }) => {
  await entrar(page, "gerente");
  await page.goto("/fiscal");
  const emitir = page.getByRole("link", { name: "Emitir" }).first();
  test.skip(!(await emitir.isVisible().catch(() => false)), "Sem venda fechada sem nota (rode o teste de vendas antes).");
  await emitir.click();
  await page.getByLabel("CFOP", { exact: true }).fill("5102");
  await page.getByLabel("NCM", { exact: true }).fill("87032100");
  await page.getByLabel("CSOSN / CST").fill("500");
  await page.getByRole("button", { name: "Emitir NF-e" }).click();
  await expect(page.getByText("Simulada — sem valor fiscal")).toBeVisible();
  await expect(page.getByText("Autorizada").first()).toBeVisible();
  await tela(page, "62-nota-simulada");
});

test("vendedor não acessa o fiscal", async ({ page }) => {
  await entrar(page, "vendedor1");
  await page.goto("/fiscal");
  await expect(page).toHaveURL(/sem-acesso/);
});
