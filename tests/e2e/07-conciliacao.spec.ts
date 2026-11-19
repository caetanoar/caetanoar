import { test, expect } from "@playwright/test";
import { entrar, tela } from "./helpers";

const s = String(Date.now()).slice(-5);

/** OFX com valores únicos para o teste poder rodar várias vezes. */
function ofx(valorRecebido: string, valorEnergia: string) {
  return `OFXHEADER:100
DATA:OFXSGML
CHARSET:1252

<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKACCTFROM><ACCTID>${s}</BANKACCTFROM><BANKTRANLIST>
<DTSTART>20261101<DTEND>20261130
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>${new Date().toISOString().slice(0, 10).replaceAll("-", "")}<TRNAMT>${valorRecebido}<FITID>R${s}<MEMO>PIX RECEBIDO CLIENTE ${s}</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>${new Date().toISOString().slice(0, 10).replaceAll("-", "")}<TRNAMT>-${valorEnergia}<FITID>E${s}<MEMO>CEMIG ${s}</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>${new Date().toISOString().slice(0, 10).replaceAll("-", "")}<TRNAMT>-9.90<FITID>T${s}<MEMO>TARIFA ${s}</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
}

test("importa extrato OFX e concilia com os lançamentos", async ({ page }) => {
  const recebido = `${Number(s) % 900 + 100}.${s.slice(-2)}`;
  const energia = `${Number(s) % 300 + 50}.45`;
  await entrar(page, "dono");

  // Conta bancária e dois lançamentos pendentes com os mesmos valores do extrato
  await page.goto("/financeiro/contas");
  await page.getByRole("button", { name: "Nova conta" }).click();
  await page.getByRole("dialog").getByLabel(/^Nome/).fill(`Sicoob ${s}`);
  await page.getByRole("dialog").getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText(`Sicoob ${s}`, { exact: true })).toBeVisible();

  for (const [tipo, desc, cat, valor] of [["receita", `Recebimento ${s}`, "Outras receitas", recebido], ["despesa", `Energia ${s}`, "Energia, água e internet", energia]] as const) {
    await page.goto(`/financeiro/lancamentos/novo?tipo=${tipo}`);
    await page.getByLabel(/^Descrição/).fill(desc);
    await page.getByLabel(/^Categoria/).selectOption({ label: cat });
    await page.getByLabel(/^Valor total/).fill(valor.replace(".", ""));
    await page.getByRole("button", { name: "Salvar lançamento" }).click();
    await expect(page.getByText(desc).first()).toBeVisible();
  }

  await page.goto("/financeiro/conciliacao");
  await page.getByLabel("Conta bancária").selectOption({ label: `Sicoob ${s}` });
  await page.getByRole("button", { name: "Trocar" }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "extrato.ofx", mimeType: "application/x-ofx", buffer: Buffer.from(ofx(recebido, energia), "latin1") });
  await expect(page.getByText(/3 transação\(ões\) nova\(s\); 2 conciliada\(s\) automaticamente/)).toBeVisible();

  // A tarifa não tinha lançamento: cria a despesa a partir do extrato
  await expect(page.getByText(`TARIFA ${s}`)).toBeVisible();
  await tela(page, "70-conciliacao-pendente");
  await page.getByRole("button", { name: "Lançar" }).click();
  await page.getByLabel("Categoria", { exact: true }).selectOption({ label: "Tarifas bancárias" });
  await page.getByRole("button", { name: "Criar lançamento" }).click();
  await expect(page.getByText("Nada pendente")).toBeVisible();

  // Reimportar o mesmo arquivo não duplica
  await page.locator('input[type="file"]').setInputFiles({ name: "extrato.ofx", mimeType: "application/x-ofx", buffer: Buffer.from(ofx(recebido, energia), "latin1") });
  await expect(page.getByText(/0 transação\(ões\) nova\(s\), 3 já importada\(s\)/)).toBeVisible();

  await page.getByRole("link", { name: /Conciliadas/ }).click();
  await expect(page.getByText(`CEMIG ${s}`)).toBeVisible();
  await tela(page, "71-conciliadas");
});
