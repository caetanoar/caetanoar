import { test, expect, type Page } from "@playwright/test";
import { entrar, tela } from "./helpers";

const placa = `TST${Math.floor(Math.random() * 10)}A${String(Math.floor(Math.random() * 90) + 10)}`;

async function fotoDeTeste(page: Page): Promise<Buffer> {
  const p = await page.context().newPage();
  await p.setViewportSize({ width: 800, height: 500 });
  await p.setContent(`<div style="width:800px;height:500px;background:linear-gradient(135deg,#1f3a5f,#f5b83d);display:flex;align-items:center;justify-content:center;font:bold 60px sans-serif;color:#fff">ONIX ${placa}</div>`);
  const buf = await p.screenshot({ type: "jpeg", quality: 80 });
  await p.close();
  return buf;
}

test("estoque inicial tem os 4 consignados", async ({ page }) => {
  await entrar(page, "dono");
  await page.goto("/estoque?tipo=consignado");
  for (const modelo of ["T-Cross", "Ka", "Uno", "HB20S"]) {
    await expect(page.getByText(new RegExp(`\\b${modelo}\\b`)).first()).toBeVisible();
  }
  await tela(page, "20-estoque-lista");

  await page.getByText("Ford Ka SE").first().click();
  await expect(page.getByText("Pendências do cadastro")).toBeVisible();
  await expect(page.getByText(/contrato de consignação/)).toBeVisible();
  await tela(page, "21-ka-detalhe");
  await page.getByRole("link", { name: "Itens e histórico" }).click();
  await expect(page.getByText("Para-choques dianteiro e traseiro repintados")).toBeVisible();
  await page.getByRole("link", { name: "Consignação" }).click();
  await expect(page.getByText("Ellerson")).toBeVisible();
});

test("gerente cadastra carro próprio com custos, itens, histórico e foto", async ({ page }) => {
  await entrar(page, "gerente");
  await page.goto("/estoque/novo?tipo=proprio");
  await page.getByLabel(/^Marca/).fill("Chevrolet");
  await page.getByLabel(/^Modelo/).fill("Onix");
  await page.getByLabel("Versão", { exact: true }).fill("LT 1.0 Turbo");
  await page.getByLabel("Motor", { exact: true }).fill("1.0 Turbo");
  await page.getByLabel("Cor", { exact: true }).fill("Prata");
  await page.getByLabel("Ano fabricação", { exact: true }).fill("2022");
  await page.getByLabel("Ano modelo", { exact: true }).fill("2023");
  await page.getByLabel("Km", { exact: true }).fill("35000");
  await page.getByLabel("Combustível", { exact: true }).selectOption("flex");
  await page.getByLabel("Câmbio", { exact: true }).selectOption("manual");
  await page.getByLabel("Placa", { exact: true }).fill(placa);
  await page.getByLabel("Preço anunciado", { exact: true }).fill("8990000");
  await page.getByLabel("Valor negociável", { exact: true }).fill("8600000");
  await page.getByLabel(/Preço mínimo/).fill("8400000");
  await page.getByLabel("Valor de compra", { exact: true }).fill("7000000");
  await tela(page, "22-form-veiculo");
  await page.getByRole("button", { name: "Cadastrar veículo" }).click();
  await expect(page.getByRole("heading", { name: "Chevrolet Onix LT 1.0 Turbo" })).toBeVisible();
  await expect(page.getByText("R$ 89.900,00").first()).toBeVisible();
  await expect(page.getByText("R$ 19.900,00")).toBeVisible(); // margem prevista antes dos custos

  // Custos de preparação
  await page.getByRole("link", { name: "Custos" }).click();
  await page.getByRole("button", { name: "Lançar custo" }).click();
  await page.getByLabel("Tipo", { exact: true }).selectOption("funilaria");
  await page.getByLabel(/^Valor\b/).first().fill("150000");
  await page.getByLabel("Descrição", { exact: true }).fill("Retoque no para-lama");
  await page.getByRole("button", { name: "Lançar", exact: true }).click();
  await expect(page.getByText("Retoque no para-lama")).toBeVisible();
  await expect(page.getByText("R$ 71.500,00")).toBeVisible(); // custo total
  await expect(page.getByText("R$ 18.400,00")).toBeVisible(); // margem

  // Itens e histórico
  await page.getByRole("link", { name: "Itens e histórico" }).click();
  await page.getByRole("button", { name: "+ Ar-condicionado" }).click();
  await expect(page.getByRole("button", { name: "Confirmar" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Confirmar" }).first().click();
  await expect(page.getByRole("button", { name: "Desconfirmar" })).toBeVisible();
  await page.getByRole("button", { name: "Registrar histórico" }).click();
  await page.getByLabel("Descrição", { exact: true }).fill("Revisão de 30 mil km na concessionária");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Revisão de 30 mil km na concessionária")).toBeVisible();
  await tela(page, "23-itens-historico");

  // Foto
  await page.getByRole("link", { name: /Fotos/ }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "onix.jpg", mimeType: "image/jpeg", buffer: await fotoDeTeste(page) });
  await expect(page.getByText("Capa")).toBeVisible({ timeout: 20_000 });
  await tela(page, "24-fotos");
});

test("vendedor vê o carro sem custo, mínimo ou margem e chama no WhatsApp", async ({ page }) => {
  await entrar(page, "vendedor1");
  await page.goto(`/estoque?q=${placa}`);
  await expect(page.getByText("Chevrolet Onix LT 1.0 Turbo")).toBeVisible();
  const wa = page.getByRole("link", { name: "Chamar no WhatsApp" }).first();
  await expect(wa).toHaveAttribute("href", /api\.whatsapp\.com\/send\?phone=5537991193815&text=/);
  await page.getByText("Chevrolet Onix LT 1.0 Turbo").click();
  await expect(page.getByText("Valor negociável")).toBeVisible();
  await expect(page.getByText("R$ 86.000,00")).toBeVisible();
  await expect(page.getByText("Preço mínimo")).toHaveCount(0);
  await expect(page.getByText("Custo total")).toHaveCount(0);
  await expect(page.getByText("Margem prevista")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Custos" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);
  await tela(page, "25-vendedor-detalhe");
  await page.goto("/estoque/novo");
  await expect(page).toHaveURL(/sem-acesso/);
});
