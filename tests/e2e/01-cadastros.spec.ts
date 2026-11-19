import { test, expect } from "@playwright/test";
import { entrar, tela } from "./helpers";

const sufixo = Date.now().toString().slice(-5);

test("gerente cadastra fornecedor, consignante e parceiro", async ({ page }) => {
  await entrar(page, "gerente");

  // Fornecedor (locadora)
  await page.goto("/fornecedores/novo");
  await page.getByLabel("Tipo").selectOption("locadora");
  await page.getByLabel("Nome").fill(`Localiza Divinópolis ${sufixo}`);
  await page.getByLabel("CPF ou CNPJ").fill("123");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("CPF ou CNPJ inválido.")).toBeVisible();
  await page.getByLabel("CPF ou CNPJ").fill("");
  await page.getByLabel("Telefone").first().fill("37988887777");
  await page.getByLabel("Cidade").fill("Divinópolis");
  await tela(page, "10-fornecedor-form");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("heading", { name: `Localiza Divinópolis ${sufixo}` })).toBeVisible();
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /api\.whatsapp\.com\/send\?phone=5537988887777/);
  await tela(page, "11-fornecedor-detalhe");

  await page.goto("/fornecedores?tipo=locadora");
  await expect(page.getByText(`Localiza Divinópolis ${sufixo}`)).toBeVisible();
  await tela(page, "12-fornecedores-lista");

  // Consignante
  await page.goto("/consignantes/novo");
  await page.getByLabel("Nome do dono do carro").fill(`Consignante Teste ${sufixo}`);
  await page.getByLabel("CPF ou CNPJ").fill("529.982.247-25".replace("25", sufixo.slice(-2)) );
  // CPF aleatório pode ser inválido: limpa e segue sem documento
  await page.getByLabel("CPF ou CNPJ").fill("");
  await page.getByLabel("Chave Pix").fill("pix@teste.com");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("heading", { name: `Consignante Teste ${sufixo}` })).toBeVisible();

  // Parceiro
  await page.goto("/parceiros/novo");
  await page.getByLabel("Nome").fill(`Parceiro ${sufixo}`);
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("heading", { name: `Parceiro ${sufixo}` })).toBeVisible();
});

test("vendedor não acessa fornecedores, consignantes nem parceiros", async ({ page }) => {
  await entrar(page, "vendedor1");
  for (const rota of ["/fornecedores", "/consignantes", "/parceiros"]) {
    await page.goto(rota);
    await expect(page).toHaveURL(/\/sem-acesso/);
  }
});
