// Gera os ícones PNG do PWA a partir do SVG do logo (usa o Chromium do Playwright).
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const svg = (tam, cantos = 14) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${tam}" height="${tam}">
<rect width="64" height="64" rx="${cantos}" fill="#1f3a5f"/>
<path d="M12 40c2-7 6-11 11-12l6-6c2-2 4-2 6-2h6c3 0 5 1 7 3l4 5c3 1 5 3 5 6v4c0 1-1 2-2 2h-3" fill="none" stroke="#f5b83d" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="21" cy="42" r="4.5" fill="none" stroke="#f5b83d" stroke-width="3.2"/>
<circle cx="45" cy="42" r="4.5" fill="none" stroke="#f5b83d" stroke-width="3.2"/>
<path d="M26 42h14" stroke="#f5b83d" stroke-width="3.2" stroke-linecap="round"/>
<text x="32" y="58" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="9" fill="#fff" letter-spacing="1">CAETANO</text>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [arquivo, tam, cantos] of [["public/icons/icon-192.png", 192, 14], ["public/icons/icon-512.png", 512, 0], ["app/apple-icon.png", 180, 0], ["app/icon.png", 64, 14]]) {
  await page.setViewportSize({ width: tam, height: tam });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(tam, cantos)}</body></html>`);
  writeFileSync(arquivo, await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: tam, height: tam } }));
}
await browser.close();
console.log("ícones gerados");
