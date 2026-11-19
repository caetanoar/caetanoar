import { test, expect } from "@playwright/test";
import { entrar, tela } from "./helpers";

const sufixo = String(Date.now()).slice(-4);
const telefone = `37997${sufixo}${String(Math.floor(Math.random() * 90) + 10)}`;
let urlCliente = "";

test("vendedor gera a legenda do Ka no formato fixo, sem promessas sem laudo", async ({ page }) => {
  await entrar(page, "vendedor1");
  await page.goto("/estoque?q=Ka");
  await page.getByRole("link", { name: /Ford Ka/ }).first().click();
  await page.getByRole("link", { name: "Anúncios" }).click();
  await page.getByRole("button", { name: /^Gerar (textos|de novo)$/ }).click();
  await expect(page.getByText(/Textos montados|Textos gerados/)).toBeVisible();

  const legenda = page.getByLabel("Legenda do Instagram");
  await expect(legenda).toHaveValue(/^FORD KA/);
  const texto = await legenda.inputValue();
  expect(texto).toContain("consulte no privado");
  // O histórico só entra no anúncio se estiver marcado como "visível no anúncio" (o do Ka não está)
  expect(texto).not.toContain("repintados");
  expect(texto).toContain("📍 Divinópolis e região");
  expect(texto).toContain("💰 R$ 42.000,00");
  expect(texto).toContain("💬 Chama no direct ou no WhatsApp");
  expect(texto).toContain("Caetano Auto, carros com procedência e história.");
  expect(texto).toContain("📲 (37) 99119-3815 | (37) 99867-8978");
  expect(texto).not.toMatch(/estado de novo|sem problemas/i);
  expect(texto).not.toContain("✅");
  await expect(page.getByText("Complete o cadastro")).toBeVisible();
  await expect(page.getByText("Sem laudo aprovado")).toBeVisible();
  await expect(page.getByLabel("Título da OLX")).not.toHaveValue("");
  await legenda.scrollIntoViewIfNeeded();
  await tela(page, "a0-anuncio-ka");

  // Se o vendedor editar e escrever "estado de novo", o sistema avisa
  await legenda.fill(`${texto}\nCarro em estado de novo!`);
  await expect(page.getByRole("alert").filter({ hasText: "estado de novo" })).toBeVisible();

  // A geração fica salva: ao voltar, o texto está lá
  await page.reload();
  await expect(page.getByLabel("Legenda do Instagram")).toHaveValue(/^FORD KA/);
  await expect(page.getByRole("button", { name: "Gerar de novo" })).toBeVisible();
});

test("vendedor gera resumo e mensagem de follow-up do próprio cliente", async ({ page }) => {
  await entrar(page, "vendedor1");
  await page.goto("/clientes/novo");
  await page.getByLabel(/^Nome/).fill(`Rafaela IA ${sufixo}`);
  await page.getByLabel("WhatsApp", { exact: true }).fill(telefone);
  await page.getByLabel("Origem do lead").selectOption("instagram");
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();
  await expect(page.getByRole("heading", { name: `Rafaela IA ${sufixo}` })).toBeVisible();
  urlCliente = page.url();

  await page.getByRole("button", { name: "Adicionar interesse" }).click();
  await page.getByLabel("Carro do estoque").selectOption({ label: "Volkswagen T-Cross 200 TSI 2026" });
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await page.getByRole("button", { name: "Registrar contato" }).click();
  await page.getByLabel(/O que foi conversado/).fill("Quer o T-Cross, pediu vídeo. CPF 529.982.247-25");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Quer o T-Cross, pediu vídeo.", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: /Gerar resumo e sugestão|Atualizar resumo/ }).click();
  const mensagem = page.getByLabel("Mensagem sugerida");
  await expect(mensagem).toHaveValue(/^Oi, Rafaela!/);
  await expect(page.getByText(/Próximo passo/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Enviar no WhatsApp" })).toHaveAttribute("href", new RegExp(`phone=55${telefone}`));
  await expect(page.getByRole("link", { name: /T-Cross/ }).first()).toBeVisible();
  await page.getByText("Assistente (IA)").scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -80));
  await tela(page, "a1-resumo-cliente");
});

test("o resumo do cliente não aparece para outro vendedor", async ({ page }) => {
  await entrar(page, "vendedor2");
  const r = await page.goto(urlCliente);
  expect(r?.status()).toBe(404);
});
