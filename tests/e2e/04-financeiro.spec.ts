import { test, expect } from "@playwright/test";
import { entrar, tela } from "./helpers";

const s = String(Date.now()).slice(-5);

test("dono cadastra contas, lança despesas, dá baixa e transfere", async ({ page }) => {
  await entrar(page, "dono");

  // Contas
  for (const [nome, tipo, saldo] of [[`Caixa ${s}`, "caixa", "100000"], [`Banco ${s}`, "banco", "1000000"]] as const) {
    await page.goto("/financeiro/contas");
    await page.getByRole("button", { name: "Nova conta" }).click();
    await page.getByLabel(/^Nome/).fill(nome);
    await page.getByLabel("Tipo", { exact: true }).selectOption(tipo);
    await page.getByLabel("Saldo inicial").fill(saldo);
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText(nome, { exact: true })).toBeVisible();
  }

  // Despesa já paga no caixa
  await page.goto("/financeiro/lancamentos/novo");
  await page.getByLabel(/^Descrição/).fill(`Energia ${s}`);
  await page.getByLabel(/^Categoria/).selectOption({ label: "Energia, água e internet" });
  await page.getByLabel(/^Valor total/).fill("35000");
  await page.getByLabel("Situação").selectOption("true");
  await page.getByLabel(/^Conta/).selectOption({ label: `Caixa ${s}` });
  await tela(page, "40-novo-lancamento");
  await page.getByRole("button", { name: "Salvar lançamento" }).click();
  await expect(page).toHaveURL(/financeiro\/pagar/);

  // Despesa pendente → aparece em A pagar → baixa
  await page.goto("/financeiro/lancamentos/novo");
  await page.getByLabel(/^Descrição/).fill(`Aluguel ${s}`);
  await page.getByLabel(/^Categoria/).selectOption({ label: "Aluguel" });
  await page.getByLabel(/^Valor total/).fill("250000");
  await page.getByRole("button", { name: "Salvar lançamento" }).click();
  await expect(page.getByText(`Aluguel ${s}`)).toBeVisible();
  await tela(page, "41-a-pagar");
  const item = page.locator("li").filter({ hasText: `Aluguel ${s}` });
  await item.getByRole("button", { name: "Pagar" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel(/^Conta/).selectOption({ label: `Banco ${s}` });
  await dialogo.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText("Pagamento registrado.")).toBeVisible();

  // Transferência banco → caixa
  await page.goto("/financeiro");
  await page.getByRole("button", { name: "Transferir entre contas" }).click();
  const dt = page.getByRole("dialog");
  await dt.getByLabel("De", { exact: true }).selectOption({ label: `Banco ${s}` });
  await dt.getByLabel("Para", { exact: true }).selectOption({ label: `Caixa ${s}` });
  await dt.getByLabel("Valor", { exact: true }).fill("50000");
  await dt.getByRole("button", { name: "Transferir", exact: true }).click();
  await expect(page.getByText("Transferência registrada.")).toBeVisible();

  // Saldos: caixa 1.000 − 350 + 500 = 1.150; banco 10.000 − 2.500 − 500 = 7.000
  await page.goto("/financeiro/contas");
  await expect(page.locator("div").filter({ hasText: new RegExp(`^Caixa ${s}`) }).getByText("R$ 1.150,00")).toBeVisible();
  await expect(page.locator("div").filter({ hasText: new RegExp(`^Banco ${s}`) }).getByText("R$ 7.000,00")).toBeVisible();
  await page.goto("/financeiro");
  await tela(page, "42-financeiro-visao");
});

test("vendedor não acessa o financeiro", async ({ page }) => {
  await entrar(page, "vendedor1");
  await page.goto("/financeiro");
  await expect(page).toHaveURL(/sem-acesso/);
});
