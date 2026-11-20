import { test, expect, type Page } from "@playwright/test";
import { entrar, tela } from "./helpers";

const L = "ABCDEFGHJKLMNPRSTUVWXYZ";
const rnd = (n: number) => Math.floor(Math.random() * n);
/** Placa Mercosul aleatória terminando no dígito pedido (o simulado decide o cenário por ele). */
const placa = (fim: number) => `${L[rnd(23)]}${L[rnd(23)]}${L[rnd(23)]}${rnd(10)}${L[rnd(23)]}${rnd(10)}${fim}`;

async function buscar(page: Page, p: string) {
  const campo = page.getByRole("search", { name: "Consultar placa" }).filter({ visible: true }).getByLabel("Placa do carro");
  await campo.fill(p);
  await campo.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/placa/${p}`));
}

const verde = placa(3);

test("vendedor consulta pelo campo do topo: selo, itens não verificados e cache", async ({ page }) => {
  await entrar(page, "vendedor1");
  await buscar(page, verde);
  await expect(page.getByText("Nada encontrado nos itens verificados")).toBeVisible();
  await expect(page.getByText("SIMULADO", { exact: true })).toBeVisible();
  await expect(page.getByText(/^Nenhum registro encontrado na consulta de \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} \(Simulado\)\.$/)).toBeVisible();
  await expect(page.locator("li", { hasText: "Recall" }).getByText("Não verificado por este provedor")).toBeVisible();
  await expect(page.getByText("Sugestão: laudo cautelar")).toBeVisible();
  await expect(page.getByText(/carro limpo|garantido|sem problemas/i)).toHaveCount(0);
  await tela(page, "d0-consulta-verde");

  // Mesma placa de novo: reaproveita a consulta (não paga outra)
  await buscar(page, verde);
  await expect(page.getByText("Consultas anteriores")).toHaveCount(0);
  // Atualizar força uma consulta nova
  await page.getByRole("button", { name: /Atualizar consulta/ }).click();
  await expect(page.getByText("Consulta atualizada.")).toBeVisible();
  await expect(page.getByText("Consultas anteriores")).toBeVisible();
});

test("cenários amarelo, vermelho e não encontrado", async ({ page }) => {
  await entrar(page, "vendedor1");
  await buscar(page, placa(5));
  await expect(page.getByText("Atenção: há registros a informar ao comprador")).toBeVisible();
  await expect(page.locator("li", { hasText: "Passagem por leilão" }).getByText(/Registro encontrado/)).toBeVisible();
  await tela(page, "d1-consulta-amarela");
  await buscar(page, placa(7));
  await expect(page.getByText("Impeditivo: não negociar sem resolver")).toBeVisible();
  await expect(page.locator("li", { hasText: "Roubo ou furto" }).getByText(/Registro encontrado/)).toBeVisible();
  await tela(page, "d2-consulta-vermelha");
  await buscar(page, placa(9));
  await expect(page.getByText("Placa não encontrada na base do provedor")).toBeVisible();
});

test("gerente cadastra no estoque a partir da consulta, com um clique", async ({ page }) => {
  const p = placa(3);
  await entrar(page, "gerente");
  await buscar(page, p);
  await page.getByRole("link", { name: "Cadastrar como próprio" }).click();
  await expect(page.getByText(/Dados preenchidos a partir da consulta da placa/)).toBeVisible();
  await expect(page.getByLabel(/^Marca/)).not.toHaveValue("");
  await expect(page.getByLabel("Placa", { exact: true })).toHaveValue(new RegExp(p.slice(0, 3)));
  await page.getByLabel("Preço anunciado", { exact: true }).fill("4500000");
  await page.getByRole("button", { name: "Cadastrar veículo" }).click();
  await expect(page.getByText("Veículo cadastrado.").or(page.getByRole("heading", { level: 1 }))).toBeVisible();
  await expect(page.getByText(/Consulta da placa em/)).toBeVisible();

  // Agora a placa aparece como carro do estoque
  await buscar(page, p);
  await expect(page.getByText("Carro do estoque da Caetano Auto")).toBeVisible();

  await page.goto("/consultas");
  await expect(page.getByText("Consultas no mês")).toBeVisible();
  await expect(page.getByText("Provedor simulado")).toBeVisible();
  await tela(page, "d3-painel-consultas");
});

test("preparador não faz consulta paga e placa inválida é recusada", async ({ page }) => {
  await entrar(page, "preparador");
  await buscar(page, placa(3));
  await expect(page.getByText("Peça a consulta a vendas, administrativo ou gestão.").or(page.getByText("Nada encontrado nos itens verificados"))).toBeVisible();
  await expect(page.getByRole("button", { name: /Consultar leilão|Atualizar consulta/ })).toHaveCount(0);
  await page.goto("/placa");
  const campo = page.getByRole("main").getByLabel("Placa do carro");
  await campo.fill("AB12");
  await campo.press("Enter");
  await expect(page).toHaveURL(/erro=placa/);
});
