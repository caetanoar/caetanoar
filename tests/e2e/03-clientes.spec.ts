import { test, expect } from "@playwright/test";
import { entrar, tela } from "./helpers";

const sufixo = String(Date.now()).slice(-4);
const telefone = `37998${sufixo}${String(Math.floor(Math.random() * 90) + 10)}`;
const nome = `Joana Teste ${sufixo}`;
let urlCliente = "";

function gerarCPF(): string {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const dv = (base: number[]) => {
    const soma = base.reduce((acc, d, i) => acc + d * (base.length + 1 - i), 0);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  n.push(dv(n));
  n.push(dv(n));
  return n.join("");
}
const cpf = gerarCPF();
const cpfMascarado = `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
const cpfFormatado = `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;

test("vendedor cadastra cliente, registra contato e interesse", async ({ page }) => {
  await entrar(page, "vendedor1");
  await page.goto("/clientes/novo");
  await page.getByLabel(/^Nome/).fill(nome);
  await page.getByLabel("WhatsApp", { exact: true }).fill(telefone);
  await page.getByLabel("Origem do lead").selectOption("instagram");
  await page.getByLabel("CPF", { exact: true }).fill(cpf);
  await tela(page, "30-cliente-form");
  await page.getByRole("button", { name: "Cadastrar cliente" }).click();
  await expect(page.getByRole("heading", { name: nome })).toBeVisible();
  urlCliente = page.url();

  // CPF mascarado e revelação com log
  await expect(page.getByText(cpfMascarado)).toBeVisible();
  await page.getByRole("button", { name: "Revelar" }).click();
  await expect(page.getByText(cpfFormatado)).toBeVisible();

  // Interesse em carro do estoque
  await page.getByRole("button", { name: "Adicionar interesse" }).click();
  await page.getByLabel("Carro do estoque").selectOption({ label: "Volkswagen T-Cross 200 TSI 2026" });
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByRole("link", { name: "Volkswagen T-Cross 200 TSI 2026" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Enviar este carro ao cliente" })).toHaveAttribute("href", new RegExp(`phone=55${telefone}`));

  // Contato com retorno agendado → sai de lead
  await page.getByRole("button", { name: "Registrar contato" }).click();
  await page.getByLabel(/O que foi conversado/).fill("Pediu fotos e simulação de financiamento em 48x");
  await page.getByRole("button", { name: "3 dias" }).click();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Pediu fotos e simulação de financiamento em 48x")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Em negociação" })).toHaveAttribute("aria-checked", "true");
  await tela(page, "31-cliente-ficha");
});

test("outro vendedor não vê o cliente e é avisado da duplicidade", async ({ page }) => {
  await entrar(page, "vendedor2");
  await page.goto(urlCliente);
  await expect(page.getByText("Página não encontrada")).toBeVisible();
  await page.goto("/clientes/novo");
  await page.getByLabel("WhatsApp", { exact: true }).fill(telefone);
  await expect(page.getByText("Este telefone já está cadastrado")).toBeVisible();
  await expect(page.getByText("(com Vendedor Um)")).toBeVisible();
  await tela(page, "32-duplicidade");
});

test("gerente vê o funil com todos os clientes", async ({ page }) => {
  await entrar(page, "gerente");
  await page.goto("/clientes/funil");
  await expect(page.getByRole("region", { name: "Em negociação" }).getByText(nome)).toBeVisible();
  await tela(page, "33-funil");
  await page.goto(urlCliente);
  await page.getByRole("radio", { name: "Perdido" }).click();
  await page.getByLabel(/^Motivo/).selectOption("preco");
  await page.getByRole("button", { name: "Marcar como perdido" }).click();
  await expect(page.getByText("Perdido: Preço")).toBeVisible();
});
