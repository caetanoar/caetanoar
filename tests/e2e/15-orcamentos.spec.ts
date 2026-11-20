import { test, expect, type Page } from "@playwright/test";
import { entrar, tela } from "./helpers";

const L = "ABCDEFGHJKLMNPRSTUVWXYZ";
const rnd = (n: number) => Math.floor(Math.random() * n);
const placa = (fim: number) => `${L[rnd(23)]}${L[rnd(23)]}${L[rnd(23)]}${rnd(10)}${L[rnd(23)]}${rnd(10)}${fim}`;
const sufixo = Date.now().toString(36).slice(-5);
const telefone = `3798${String(rnd(10_000_000)).padStart(7, "0")}`;

async function buscar(page: Page, p: string) {
  const campo = page.getByRole("search", { name: "Consultar placa" }).filter({ visible: true }).getByLabel("Placa do carro");
  await campo.fill(p);
  await campo.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/placa/${p}`));
}

let carroId = "";
let orcamentoUrl = "";

test.describe.configure({ mode: "serial" });

test("dono configura validade e taxas da simulação", async ({ page }) => {
  await entrar(page, "dono");
  await page.goto("/configuracoes/orcamentos");
  await page.getByLabel("Validade padrão (dias)").fill("7");
  await page.getByLabel("Taxas da simulação de financiamento").fill("36; 1,89\n48; 1,99");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Configuração de orçamentos salva.")).toBeVisible();
});

test("gerente põe no estoque um carro com alerta amarelo na consulta", async ({ page }) => {
  await entrar(page, "gerente");
  await buscar(page, placa(5));
  await page.getByRole("link", { name: "Cadastrar como próprio" }).click();
  await page.getByLabel("Preço anunciado", { exact: true }).fill("5000000");
  await page.getByRole("button", { name: "Cadastrar veículo" }).click();
  await expect(page).toHaveURL(/\/estoque\/[0-9a-f-]{36}/);
  carroId = page.url().match(/estoque\/([0-9a-f-]{36})/)![1];
});

test("vendedor monta orçamento com troca consultada pela placa e desconto fora do limite", async ({ page }) => {
  await entrar(page, "vendedor1");
  await page.goto(`/estoque/${carroId}`);
  await page.getByRole("link", { name: "Criar orçamento" }).click();
  await expect(page).toHaveURL(new RegExp(`/orcamentos/novo\\?veiculo=${carroId}`));

  await page.getByRole("button", { name: "Cliente novo" }).click();
  await page.getByLabel(/Nome do cliente novo/).fill(`Cliente Orçamento ${sufixo}`);
  await page.getByLabel(/WhatsApp/).fill(telefone);

  await page.getByLabel(/Valor do orçamento/).fill("4800000");
  await expect(page.getByText("Fora do seu limite: precisa de aprovação do gerente ou do dono")).toBeVisible();
  await page.getByLabel(/Motivo do desconto/).fill("Cliente fecha hoje com troca e financiamento");

  // Carro de troca consultado pela placa (cenário verde do simulado)
  await page.getByRole("button", { name: "Troca", exact: true }).click();
  await page.getByLabel("Placa do carro de troca").fill(placa(3));
  await page.getByRole("button", { name: "Consultar", exact: true }).click();
  await expect(page.getByLabel("Marca da troca")).not.toHaveValue("", { timeout: 15_000 });
  await expect(page.getByText("Nada encontrado nos itens verificados")).toBeVisible();
  await page.getByLabel(/Valor avaliado/).fill("1500000");

  // Entrada no Pix + financiamento (com simulação marcada como simulação)
  await page.getByRole("button", { name: "Forma", exact: true }).click();
  await page.getByLabel("Valor", { exact: true }).first().fill("1000000");
  await page.getByRole("button", { name: "Forma", exact: true }).click();
  await page.getByLabel("Forma", { exact: true }).nth(1).selectOption("financiamento");
  await page.getByLabel("Banco", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Parcelas", { exact: true }).fill("48");
  await expect(page.getByText(/Valor financiado R\$\s?23\.000,00 em/)).toBeVisible();
  await expect(page.getByText(/Simulação, sem aprovação de crédito/).first()).toBeVisible();
  await expect(page.getByText(/Pagamentos \+ trocas: R\$\s?48\.000,00 de R\$\s?48\.000,00/)).toBeVisible();
  await tela(page, "e0-orcamento-formulario");

  await page.getByRole("button", { name: "Salvar orçamento" }).click();
  await expect(page).toHaveURL(/\/orcamentos\/[0-9a-f-]{36}$/);
  orcamentoUrl = new URL(page.url()).pathname;
  await expect(page.getByRole("heading", { name: "Desconto aguardando aprovação" })).toBeVisible();
  await expect(page.getByText("Passagem por leilão").first()).toBeVisible();
  await expect(page.getByText("Estes alertas entram no orçamento ao enviar e não podem ser removidos.")).toBeVisible();
  await page.waitForTimeout(4500); // toast de "Orçamento salvo" some
  await tela(page, "e1-orcamento-aguardando");
  // Não envia antes da aprovação
  await page.getByRole("button", { name: "Enviar ao cliente" }).click();
  await expect(page.getByText(/aguarda aprovação/).first()).toBeVisible();
});

test("gerente aprova o desconto pela fila de aprovações", async ({ page }) => {
  await entrar(page, "gerente");
  await page.goto("/orcamentos");
  await page.getByRole("link", { name: /aguardando sua aprovação/ }).click();
  await expect(page).toHaveURL(/\/orcamentos\/aprovacoes/);
  const cartao = page.locator("[data-slot=card]", { hasText: `Cliente Orçamento ${sufixo}` });
  await expect(cartao.getByText(/Desconto: R\$\s?2\.000,00 \(4%\)/)).toBeVisible();
  await tela(page, "e2-aprovacoes");
  await cartao.getByLabel(/Motivo da decisão/).fill("Cliente com troca boa e financiamento aprovado");
  await cartao.getByRole("button", { name: "Aprovar desconto" }).click();
  await expect(page.getByText("Desconto aprovado.")).toBeVisible();
});

test("vendedor envia, abre WhatsApp, PDF e link público; cliente aceita e vira venda", async ({ page, browser }) => {
  await entrar(page, "vendedor1");
  await page.goto(orcamentoUrl);
  await expect(page.getByText(/Desconto aprovado em/)).toBeVisible();
  await page.getByRole("button", { name: "Enviar ao cliente" }).click();
  const wa = page.getByRole("link", { name: "Enviar ao cliente pelo WhatsApp" });
  await expect(wa).toBeVisible();
  const href = (await wa.getAttribute("href"))!;
  const url = new URL(href);
  expect(url.searchParams.get("phone")).toBe(`55${telefone}`);
  expect(url.searchParams.get("text")).toContain("(37) 99119-3815");
  expect(url.searchParams.get("text")).toMatch(/\/o\/[A-Za-z0-9_-]{20,}/);
  await tela(page, "e3-orcamento-enviado");

  const pdf = await page.request.get(`${orcamentoUrl}/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");

  // Link público, sem login
  const link = (await page.getByText(/^Link do orçamento:/).textContent())!.replace("Link do orçamento:", "").trim();
  const anonimo = await browser.newContext({ ...{ viewport: { width: 412, height: 915 } }, locale: "pt-BR" });
  const publica = await anonimo.newPage();
  await publica.goto(link);
  await expect(publica.getByRole("heading", { name: /^Orçamento O-\d{4}-\d{4}$/ })).toBeVisible();
  await expect(publica.getByText("Passagem por leilão").first()).toBeVisible();
  await expect(publica.getByText(/Simulação, sem aprovação de crédito/)).toBeVisible();
  await expect(publica.getByRole("link", { name: "Falar com a loja no WhatsApp" })).toHaveAttribute("href", /phone=5537991193815/);
  await expect(publica.getByText(/carro limpo|garantido|sem problemas/i)).toHaveCount(0);
  await tela(publica, "e4-orcamento-publico");
  await anonimo.close();

  await page.getByRole("button", { name: "Cliente aceitou" }).click();
  await expect(page.getByRole("button", { name: "Converter em venda" })).toBeVisible();
  await page.getByRole("button", { name: "Converter em venda" }).click();
  await expect(page).toHaveURL(/\/vendas\/[0-9a-f-]{36}/);
  await expect(page.getByText(/R\$\s?48\.000,00/).first()).toBeVisible();
  await tela(page, "e5-venda-do-orcamento");
});

test("link público inválido não abre nada", async ({ page }) => {
  await entrar(page, "vendedor1");
  await page.goto("/o/token-que-nao-existe-de-jeito-nenhum");
  await expect(page.getByText(/não encontrad|404/i).first()).toBeVisible();
});
