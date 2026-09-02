import chromium from "@sparticuz/chromium";
import playwright from "playwright-core";
import { resolveAppBaseUrl } from "@/lib/riscos-relatorio-app-base-url";
import { RISCOS_RELATORIO_PRINTING_CLASS } from "@/lib/riscos-relatorio-pdf";

export { resolveAppBaseUrl } from "@/lib/riscos-relatorio-app-base-url";
export type GerarPdfRelatorioRiscosOptions = {
  baseUrl: string;
  token: string;
};

/**
 * Gera o PDF no servidor abrindo a rota efêmera de impressão (mesmo RelatorioDocumento da UI).
 */
export async function gerarPdfRelatorioRiscosBuffer(
  options: GerarPdfRelatorioRiscosOptions
): Promise<Buffer> {
  const baseUrl = options.baseUrl.replace(/\/$/, "");
  const url = `${baseUrl}/riscos-relatorio-print/${encodeURIComponent(options.token)}`;

  const isLocal = /localhost|127\.0\.0\.1/.test(baseUrl);
  const executablePath = isLocal
    ? process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim() ||
      process.env.CHROME_PATH?.trim() ||
      undefined
    : await chromium.executablePath();

  const browser = await playwright.chromium.launch({
    args: isLocal ? ["--no-sandbox", "--disable-setuid-sandbox"] : chromium.args,
    executablePath,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
    await page.waitForSelector("#riscos-relatorio-print-root", {
      timeout: 60_000,
    });
    await page.evaluate((printClass) => {
      document.body.classList.add(printClass);
    }, RISCOS_RELATORIO_PRINTING_CLASS);
    await page.waitForTimeout(800);
    await page.emulateMedia({ media: "print" });

    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });

    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}
