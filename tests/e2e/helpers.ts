import { expect, type Page } from "@playwright/test";

export const USUARIOS = {
  dono: { email: "arthur@caetanoauto.local", nome: "Arthur" },
  gerente: { email: "gerente@caetanoauto.local", nome: "Gerente Teste" },
  vendedor1: { email: "vendedor1@caetanoauto.local", nome: "Vendedor Um" },
  vendedor2: { email: "vendedor2@caetanoauto.local", nome: "Vendedor Dois" },
  atendimento: { email: "atendimento@caetanoauto.local", nome: "Atendimento Teste" },
  preparador: { email: "preparador@caetanoauto.local", nome: "Preparador Teste" },
  administrativo: { email: "administrativo@caetanoauto.local", nome: "Administrativo Teste" },
} as const;

export const SENHA = "caetano123";

export async function entrar(page: Page, quem: keyof typeof USUARIOS) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(USUARIOS[quem].email);
  await page.getByLabel("Senha").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** Pasta onde os screenshots para o usuário são salvos. */
export const PASTA_TELAS = process.env.PASTA_TELAS ?? "test-results/telas";

export async function tela(page: Page, nome: string) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.screenshot({ path: `${PASTA_TELAS}/${nome}.png`, fullPage: false });
}
