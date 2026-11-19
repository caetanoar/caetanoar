import { test, expect } from "@playwright/test";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { entrar, tela } from "./helpers";
import { verificarAssinatura } from "../../lib/webhooks/assinatura";

type Recebido = { corpo: string; assinatura: string; evento: string };

test("dono cria chave e webhook; site lê o estoque, envia lead e recebe o aviso assinado", async ({ page }) => {
  // Receptor de webhooks local (simula o site da loja)
  const recebidos: Recebido[] = [];
  const servidor = http.createServer((req, res) => {
    let corpo = "";
    req.on("data", (c) => (corpo += c));
    req.on("end", () => {
      recebidos.push({ corpo, assinatura: String(req.headers["x-caetano-assinatura"] ?? ""), evento: String(req.headers["x-caetano-evento"] ?? "") });
      res.writeHead(200).end("ok");
    });
  });
  await new Promise<void>((r) => servidor.listen(0, "127.0.0.1", r));
  const porta = (servidor.address() as AddressInfo).port;
  const urlHook = `http://127.0.0.1:${porta}/hook`;

  try {
    await entrar(page, "dono");
    await page.goto("/configuracoes/integracoes");
    await expect(page.getByText("Modo simulado (defina ANTHROPIC_API_KEY para ligar)")).toBeVisible();

    // Chave com estoque:ler + leads:criar (sem vendas:ler)
    await page.getByRole("button", { name: "Nova chave" }).click();
    const dlg = page.getByRole("dialog");
    await dlg.getByLabel(/^Nome/).fill("Site E2E");
    await dlg.getByRole("checkbox").nth(1).check();
    await dlg.getByRole("button", { name: "Criar chave" }).click();
    const chave = (await dlg.getByLabel("Chave", { exact: true }).textContent())!.trim();
    expect(chave).toMatch(/^ca_[A-Za-z0-9_-]{32}$/);
    await page.keyboard.press("Escape");
    const h = { Authorization: `Bearer ${chave}` };

    // Estoque público, sem campos sigilosos
    const r1 = await page.request.get("/api/v1/veiculos", { headers: h });
    expect(r1.status()).toBe(200);
    const texto = await r1.text();
    for (const sigiloso of ["preco_minimo", "valor_compra", "preco_negociavel", "placa", "chassi", "consignante"]) expect(texto).not.toContain(sigiloso);
    const { dados } = JSON.parse(texto) as { dados: { id: string; modelo: string }[] };
    const tcross = dados.find((v) => v.modelo === "T-Cross");
    expect(tcross).toBeTruthy();
    expect((await page.request.get(`/api/v1/veiculos/${tcross!.id}`, { headers: h })).status()).toBe(200);
    expect((await page.request.get("/api/v1/veiculos")).status()).toBe(401);
    expect((await page.request.get("/api/v1/vendas", { headers: h })).status()).toBe(403);
    expect((await page.request.get("/api/v1/openapi.json")).status()).toBe(200);

    // Webhook para o receptor local, inscrito em cliente.criado
    await page.getByRole("button", { name: "Novo webhook" }).click();
    await dlg.getByLabel(/^Nome/).fill("Receptor E2E");
    await dlg.getByLabel(/^URL/).fill(urlHook);
    await dlg.getByRole("checkbox", { name: /cliente\.criado/ }).check();
    await dlg.getByRole("button", { name: "Criar webhook" }).click();
    const segredo = (await dlg.getByLabel("Segredo", { exact: true }).textContent())!.trim();
    expect(segredo).toMatch(/^whsec_/);
    await page.keyboard.press("Escape");

    // Teste manual do webhook
    await page.locator("li", { hasText: urlHook }).getByRole("button", { name: "Enviar teste" }).click();
    await expect.poll(() => recebidos.filter((r) => r.evento === "webhook.teste").length, { timeout: 15_000 }).toBe(1);

    // Lead pela API: 201 na primeira vez, 200 (sem duplicar) na segunda
    const telefone = `3798${String(Date.now()).slice(-7)}`;
    const lead = { nome: "Lead Site E2E", telefone, mensagem: "Vi o T-Cross no site", veiculo_id: tcross!.id };
    const l1 = await page.request.post("/api/v1/leads", { headers: h, data: lead });
    expect(l1.status()).toBe(201);
    const l2 = await page.request.post("/api/v1/leads", { headers: h, data: lead });
    expect(l2.status()).toBe(200);
    expect((await page.request.post("/api/v1/leads", { headers: h, data: { nome: "X" } })).status()).toBe(422);

    // O site recebe o aviso "cliente.criado", assinado e sem telefone
    await expect.poll(() => recebidos.filter((r) => r.evento === "cliente.criado").length, { timeout: 15_000 }).toBe(1);
    const aviso = recebidos.find((r) => r.evento === "cliente.criado")!;
    expect(verificarAssinatura(segredo, aviso.assinatura, aviso.corpo)).toBe(true);
    expect(verificarAssinatura("whsec_errado", aviso.assinatura, aviso.corpo)).toBe(false);
    expect(JSON.parse(aviso.corpo)).toMatchObject({ tipo: "cliente.criado", dados: { nome: "Lead", origem: "site" } });
    expect(aviso.corpo).not.toContain(telefone);

    await page.reload();
    await expect(page.getByText("Entregue").first()).toBeVisible();
    await tela(page, "b0-integracoes");

    // Revogar: a chave para de funcionar na hora
    page.once("dialog", (d) => d.accept());
    await page.locator("li", { hasText: "Site E2E" }).filter({ hasText: "Ativa" }).first().getByRole("button", { name: "Revogar" }).click();
    await expect(page.getByText("Chave revogada.")).toBeVisible();
    expect((await page.request.get("/api/v1/veiculos", { headers: h })).status()).toBe(401);
  } finally {
    servidor.close();
  }
});

test("gerente não acessa as integrações", async ({ page }) => {
  await entrar(page, "gerente");
  await page.goto("/configuracoes/integracoes");
  await expect(page).toHaveURL(/sem-acesso/);
});
