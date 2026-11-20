import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { entrar, tela, PASTA_TELAS } from "./helpers";

const L = "ABCDEFGHJKLMNPRSTUVWXYZ";
const rnd = (n: number) => Math.floor(Math.random() * n);
/** Placa aleatória; o provedor simulado decide o cenário pelo último dígito (5 = amarelo, 7 = vermelho). */
const placa = (fim: number) => `${L[rnd(23)]}${L[rnd(23)]}${L[rnd(23)]}${rnd(10)}${L[rnd(23)]}${rnd(10)}${fim}`;
const sufixo = Date.now().toString(36).slice(-5);
const cliente = `Comprador Verificação ${sufixo}`;
const telefone = `3797${String(rnd(10_000_000)).padStart(7, "0")}`;
const termoAssinado = { name: "termo-assinado.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% termo assinado (teste)\n%%EOF\n") };

const carros = { amarelo: "", vermelho: "" };
const vendas = { amarelo: "", vermelho: "" };

test.describe.configure({ mode: "serial" });

async function cadastrarPelaConsulta(page: Page, p: string, preco: string) {
  const campo = page.getByRole("search", { name: "Consultar placa" }).filter({ visible: true }).getByLabel("Placa do carro");
  await campo.fill(p);
  await campo.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/placa/${p}`));
  await page.getByRole("link", { name: "Cadastrar como próprio" }).click();
  await page.getByLabel("Preço anunciado", { exact: true }).fill(preco);
  await page.getByRole("button", { name: "Cadastrar veículo" }).click();
  await expect(page).toHaveURL(/\/estoque\/[0-9a-f-]{36}/);
  return page.url().match(/estoque\/([0-9a-f-]{36})/)![1];
}

async function registrarVenda(page: Page, carro: string, valor: string) {
  await page.goto(`/vendas/nova?veiculo=${carro}`);
  await page.getByLabel(/^Cliente/).selectOption({ label: cliente });
  await page.getByLabel("Valor", { exact: true }).first().fill(valor);
  await expect(page.getByText("Fechado", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Enviar para aprovação" }).click();
  await expect(page).toHaveURL(/\/vendas\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Venda salva como rascunho: o carro tem alertas.").first()).toBeVisible();
  return new URL(page.url()).pathname;
}

test("gerente põe no estoque um carro amarelo (leilão) e um vermelho (roubo/furto)", async ({ page }) => {
  await entrar(page, "gerente");
  carros.amarelo = await cadastrarPelaConsulta(page, placa(5), "4200000");
  carros.vermelho = await cadastrarPelaConsulta(page, placa(7), "3800000");
});

test("alerta amarelo: vendedor registra a ciência, gera e anexa o Termo de Ciência; gerente fecha", async ({ page }) => {
  await entrar(page, "vendedor1");
  await page.goto("/clientes/novo");
  await page.getByLabel(/^Nome/).fill(cliente);
  await page.getByLabel("WhatsApp", { exact: true }).fill(telefone);
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();
  await expect(page.getByRole("heading", { name: cliente })).toBeVisible();

  vendas.amarelo = await registrarVenda(page, carros.amarelo, "4200000");
  await expect(page.getByText("Rascunho", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Atenção: informar o cliente")).toBeVisible();
  await expect(page.getByText("Passagem por leilão").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar para aprovação do gerente" })).toHaveCount(0);
  await tela(page, "f0-venda-amarela-rascunho");

  // Sem marcar a confirmação, não registra
  await page.getByRole("button", { name: "Registrar ciência do cliente" }).click();
  await expect(page.getByText("Confirme que informou o cliente.").first()).toBeVisible();
  await page.getByLabel(/Informei o cliente, antes da compra/).check();
  await page.getByRole("button", { name: "Registrar ciência do cliente" }).click();
  await expect(page.getByText(/Ciência registrada por Vendedor Um/)).toBeVisible();

  // Termo de Ciência em PDF com os alertas
  const pdf = await page.request.get(`${vendas.amarelo}/termo-ciencia`);
  expect(pdf.status()).toBe(200);
  const corpo = await pdf.body();
  expect(corpo.subarray(0, 4).toString()).toBe("%PDF");
  const arquivo = `${PASTA_TELAS}/termo-ciencia.pdf`;
  writeFileSync(arquivo, corpo);
  try {
    execFileSync("pdftoppm", ["-png", "-r", "110", "-singlefile", arquivo, `${PASTA_TELAS}/f1-termo-ciencia`]);
  } catch {
    /* pdftoppm é opcional: só gera a imagem do termo para conferência */
  }
  // Ainda falta o termo assinado: o pedido de aprovação fica disponível, o fechamento não
  await expect(page.getByText("Anexe o Termo de Ciência assinado pelo cliente.")).toBeVisible();
  await page.getByLabel("Arquivo do termo assinado").setInputFiles(termoAssinado);
  await expect(page.getByText("Termo assinado anexado").first()).toBeVisible();
  await page.getByRole("button", { name: "Enviar para aprovação do gerente" }).click();
  await expect(page.getByText("Aguardando aprovação").first()).toBeVisible();
  await tela(page, "f2-venda-amarela-pronta");

  await entrar(page, "gerente");
  await page.goto(vendas.amarelo);
  await page.getByRole("button", { name: "Fechar venda" }).click();
  await expect(page.getByText("Fechada", { exact: true })).toBeVisible();
  await expect(page.getByText("Verificação no fechamento")).toBeVisible();
  await expect(page.getByText("Passagem por leilão").first()).toBeVisible();
});

test("alerta vermelho: bloqueia; gerente não fecha; só o dono libera com justificativa", async ({ page }) => {
  await entrar(page, "vendedor1");
  vendas.vermelho = await registrarVenda(page, carros.vermelho, "3800000");
  await expect(page.getByText("Impeditivo", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Roubo ou furto/).first()).toBeVisible();
  await expect(page.getByText("Alerta impeditivo: a venda só segue se o dono liberar, com justificativa.")).toBeVisible();
  await page.getByLabel(/Informei o cliente, antes da compra/).check();
  await page.getByRole("button", { name: "Registrar ciência do cliente" }).click();
  await expect(page.getByText(/Ciência registrada por Vendedor Um/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar para aprovação do gerente" })).toHaveCount(0);
  await tela(page, "f3-venda-vermelha-bloqueada");

  await entrar(page, "gerente");
  await page.goto(vendas.vermelho);
  await expect(page.getByText(/Verificação do veículo: Há alerta impeditivo/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Fechar venda" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Liberar venda" })).toHaveCount(0);

  await entrar(page, "dono");
  await page.goto("/tarefas");
  await expect(page.getByText(/Analisar impeditivo da venda V-\d{4}-\d{4}/).first()).toBeVisible();
  await page.goto(vendas.vermelho);
  await page.getByRole("button", { name: "Liberar venda" }).click();
  await expect(page.getByText(/pelo menos 15 caracteres/).first()).toBeVisible();
  await page.getByLabel(/Justificativa da liberação/).fill("BO baixado: carro recuperado e documentação regularizada no Detran");
  await page.getByRole("button", { name: "Liberar venda" }).click();
  await expect(page.getByText("Venda liberada pelo dono")).toBeVisible();
  await tela(page, "f4-venda-vermelha-liberada");

  // Liberada, mas o cliente continua sendo informado (termo assinado para fechar)
  await page.getByLabel("Arquivo do termo assinado").setInputFiles(termoAssinado);
  await expect(page.getByText("Termo assinado anexado").first()).toBeVisible();
  await page.getByRole("button", { name: "Fechar venda" }).click();
  await expect(page.getByText("Fechada", { exact: true })).toBeVisible();
  await tela(page, "f5-venda-vermelha-fechada");
});
