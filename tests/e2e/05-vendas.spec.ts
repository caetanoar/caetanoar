import { test, expect } from "@playwright/test";
import { entrar, tela } from "./helpers";

const s = String(Date.now()).slice(-4);
const letras = "ABCDEFGHJKLMNPRSTUVWXYZ";
const l = () => letras[Math.floor(Math.random() * letras.length)];
const placaCarro = `${l()}${l()}${l()}${s[0]}${l()}${s.slice(2)}`;
const placaTroca = `${l()}${l()}${l()}${s[1]}${l()}${s.slice(2)}`;
const telefone = `37997${s}${String(Math.floor(Math.random() * 90) + 10)}`;
const cliente = `Comprador ${s}`;
let urlCarro = "";
let urlVenda = "";

test.describe.configure({ mode: "serial" });

test("dono define as regras de comissão", async ({ page }) => {
  await entrar(page, "dono");
  await page.goto("/configuracoes/comissoes");
  for (const regra of [
    { nome: `E2E Loja padrão ${s}`, tipo: "loja_consignado", pct: "10", piso: "300000", teto: "800000" },
    { nome: `E2E Vendedor consignado ${s}`, tipo: "vendedor", pct: "10" },
  ]) {
    await page.getByRole("button", { name: "Nova regra" }).click();
    const d = page.getByRole("dialog");
    await d.getByLabel(/^Nome/).fill(regra.nome);
    await d.getByLabel("Tipo", { exact: true }).selectOption(regra.tipo);
    await d.getByLabel("Percentual (%)").fill(regra.pct);
    if (regra.piso) {
      await d.getByLabel("Piso (mínimo)").fill(regra.piso);
      await d.getByLabel("Teto (máximo)").fill(regra.teto!);
    }
    if (regra.tipo === "vendedor") await d.getByLabel("Vale para").selectOption("consignado");
    await d.getByRole("button", { name: "Salvar regra" }).click();
    await expect(page.locator("p.font-medium", { hasText: regra.nome }).first()).toBeVisible();
  }
  await tela(page, "50-regras-comissao");
});

test("gerente cadastra um consignado para a venda", async ({ page }) => {
  await entrar(page, "gerente");
  await page.goto("/estoque/novo?tipo=consignado");
  await page.getByLabel(/^Marca/).fill("Fiat");
  await page.getByLabel(/^Modelo/).fill("Argo");
  await page.getByLabel("Versão", { exact: true }).fill("Drive 1.0");
  await page.getByLabel("Ano modelo", { exact: true }).fill("2022");
  await page.getByLabel("Placa", { exact: true }).fill(placaCarro);
  await page.getByLabel("Preço anunciado", { exact: true }).fill("7000000");
  await page.getByLabel("Valor negociável", { exact: true }).fill("6800000");
  await page.getByLabel(/^Consignante/).selectOption({ label: "Edley" });
  await page.getByRole("button", { name: "Cadastrar veículo" }).click();
  await expect(page.getByRole("heading", { name: "Fiat Argo Drive 1.0" })).toBeVisible();
  urlCarro = page.url();
});

test("vendedor registra a venda com financiamento e carro na troca", async ({ page }) => {
  await entrar(page, "vendedor1");
  await page.goto("/clientes/novo");
  await page.getByLabel(/^Nome/).fill(cliente);
  await page.getByLabel("WhatsApp", { exact: true }).fill(telefone);
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();
  await expect(page.getByRole("heading", { name: cliente })).toBeVisible();

  await page.goto(urlCarro);
  await page.getByRole("link", { name: "Registrar venda" }).click();
  await page.getByLabel(/^Cliente/).selectOption({ label: cliente });
  await expect(page.getByLabel(/^Valor da venda/)).toHaveValue("70.000,00");

  // Pix 20 mil + financiamento 40 mil (BV, 48x)
  await page.getByLabel("Valor", { exact: true }).first().fill("2000000");
  await page.getByRole("button", { name: "Adicionar forma de pagamento" }).click();
  const formas = page.getByLabel("Forma", { exact: true });
  await formas.nth(1).selectOption("financiamento");
  await page.getByLabel("Valor", { exact: true }).nth(1).fill("4000000");
  await page.getByLabel("Banco", { exact: true }).selectOption("BV");
  await page.getByLabel("Parcelas", { exact: true }).fill("48");

  // Troca: Gol 2015 avaliado em 10 mil
  await page.getByRole("button", { name: "Adicionar carro na troca" }).click();
  await page.getByLabel("Placa", { exact: true }).fill(placaTroca);
  await page.getByLabel("Marca", { exact: true }).fill("Volkswagen");
  await page.getByLabel("Modelo", { exact: true }).fill("Gol");
  await page.getByLabel("Ano modelo", { exact: true }).fill("2015");
  await page.getByLabel(/^Valor da avaliação/).fill("1000000");
  await expect(page.getByText("Fechado", { exact: true })).toBeVisible();
  await tela(page, "51-venda-form");
  await page.getByRole("button", { name: "Enviar para aprovação" }).click();
  await expect(page.getByText("Aguardando aprovação").first()).toBeVisible();
  urlVenda = page.url();
  await expect(page.getByText("R$ 30.000,00")).toBeVisible(); // entrada = pix + troca
  await tela(page, "52-venda-aguardando");

  // Vendedor não fecha nem vê lucro
  await expect(page.getByRole("button", { name: "Fechar venda" })).toHaveCount(0);
  await expect(page.getByText("Lucro da venda")).toHaveCount(0);
});

test("gerente confere comissões e fecha a venda", async ({ page }) => {
  await entrar(page, "gerente");
  await page.goto(urlVenda);
  await expect(page.getByText("R$ 7.000,00", { exact: false }).first()).toBeVisible(); // comissão da loja (10% de 70 mil)
  await expect(page.getByText(/R\$ 700,00/).first()).toBeVisible(); // vendedor: 10% da comissão da loja
  await expect(page.getByText("R$ 63.000,00")).toBeVisible(); // repasse ao dono
  await tela(page, "53-venda-conferencia");
  await page.getByRole("button", { name: "Fechar venda" }).click();
  await expect(page.getByText("Fechada", { exact: true })).toBeVisible();
  await expect(page.getByText(/Garantia de 90 dias/)).toBeVisible();
  await expect(page.getByText("Comissão do vendedor").first()).toBeVisible();
  await tela(page, "54-venda-fechada");

  // Carro da troca no estoque, próprio e em preparação
  await page.getByRole("link", { name: "(no estoque)" }).click();
  await expect(page.getByRole("heading", { name: /Volkswagen Gol/ })).toBeVisible();
  await expect(page.getByText("Em preparação").first()).toBeVisible();
  await expect(page.getByText("Próprio").first()).toBeVisible();
  await tela(page, "55-troca-no-estoque");

  // Carro vendido
  await page.goto(urlCarro);
  await expect(page.getByText("Vendido").first()).toBeVisible();

  // Garantia ativa e repasse a pagar
  await page.goto("/garantias");
  await expect(page.getByText(cliente).first()).toBeVisible();
  await page.goto("/financeiro/pagar");
  await expect(page.getByText(/Repasse ao dono — venda/).first()).toBeVisible();
});

test("vendedor vê a própria comissão", async ({ page }) => {
  await entrar(page, "vendedor1");
  await page.goto("/minhas-comissoes");
  await expect(page.getByText("Fiat Argo").first()).toBeVisible();
  await expect(page.getByText("R$ 700,00").first()).toBeVisible();
  await tela(page, "56-minhas-comissoes");
});
