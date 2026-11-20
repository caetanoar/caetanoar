import { test, expect } from "@playwright/test";
import { entrar } from "./helpers";

/** Nenhuma tela principal pode rolar para o lado no celular (texto longo deve ser cortado com "…"). */
const ROTAS = ["/painel", "/dashboard", "/estoque", "/clientes", "/vendas", "/financeiro", "/financeiro/pagar", "/garantias", "/comissoes", "/fiscal", "/relatorios", "/tarefas", "/placa", "/consultas", "/configuracoes"];

test("dono: telas principais sem rolagem horizontal", async ({ page }) => {
  await entrar(page, "dono");
  for (const rota of ROTAS) {
    await page.goto(rota);
    await page.waitForLoadState("networkidle").catch(() => {});
    const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(sobra, `${rota} rola ${sobra}px para o lado`).toBeLessThanOrEqual(1);
  }
});
