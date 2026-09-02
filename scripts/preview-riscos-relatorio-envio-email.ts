/**
 * Preview visual real do e-mail de envio do relatório de Riscos.
 * Usa as artes em /public sem alterá-las (paths relativos a tmp/).
 *
 * Executar: npx tsx scripts/preview-riscos-relatorio-envio-email.ts
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import chromium from "@sparticuz/chromium";
import playwright from "playwright-core";
import { RISCOS_RELATORIO_EMAIL_ASSET_FILES } from "../lib/email/riscos-relatorio-envio-email-assets";
import { getResendReplyToAddress } from "../lib/email/resend-config";
import { RISCOS_APP_PRODUCTION_HOST } from "../lib/riscos-relatorio-app-base-url";
import {
  buildAssuntoRelatorioRiscosEmail,
  buildRelatorioRiscosEnvioEmailHtml,
} from "../lib/email/templates/relatorio-riscos-envio-email";

const empresaDemo = "Metalúrgica Horizonte Ltda.";
const outDir = path.join(process.cwd(), "tmp");
const visualHtmlName = "preview-riscos-relatorio-envio-email-visual.html";
const visualHtmlPath = path.join(outDir, visualHtmlName);

/** Paths relativos de tmp/ → public/email/... (artes originais, sem cópia). */
const visualAssetsBaseUrl = "../public";

function assertArtFilesExist(): void {
  for (const rel of Object.values(RISCOS_RELATORIO_EMAIL_ASSET_FILES)) {
    const absolute = path.join(process.cwd(), "public", rel.replace(/^\//, ""));
    if (!fs.existsSync(absolute)) {
      throw new Error(`Arte não encontrada: ${absolute}`);
    }
  }
}

async function resolveChromiumExecutable(): Promise<string | undefined> {
  const fromEnv =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim() ||
    process.env.CHROME_PATH?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;

  if (process.platform === "win32") {
    const candidates = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      path.join(
        process.env.LOCALAPPDATA ?? "",
        "Google",
        "Chrome",
        "Application",
        "chrome.exe"
      ),
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
    for (const candidate of candidates) {
      if (candidate && fs.existsSync(candidate)) return candidate;
    }
  }

  try {
    const sparticuz = await chromium.executablePath();
    if (sparticuz && fs.existsSync(sparticuz)) return sparticuz;
  } catch {
    // ignore
  }

  return undefined;
}

async function captureScreenshot(
  htmlPath: string,
  outputPath: string,
  viewport: { width: number; height: number }
): Promise<boolean> {
  const resolvedExecutable = await resolveChromiumExecutable();

  if (!resolvedExecutable) {
    console.warn(
      "Screenshot omitido: Chromium/Chrome não encontrado. Defina PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH se necessário."
    );
    return false;
  }

  const browser = await playwright.chromium.launch({
    executablePath: resolvedExecutable,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.width <= 400 ? 2 : 1,
    });
    await page.goto(pathToFileURL(htmlPath).href, {
      waitUntil: "networkidle",
      timeout: 30_000,
    });
    await page.waitForSelector('img[src*="cabecalho.jpg"]', { timeout: 10_000 });
    await page.waitForSelector('img[src*="rodape.jpg"]', { timeout: 10_000 });
    await page.waitForTimeout(400);

    await page.screenshot({
      path: outputPath,
      fullPage: true,
      type: "png",
    });
    return true;
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  assertArtFilesExist();
  fs.mkdirSync(outDir, { recursive: true });

  const visualHtml = buildRelatorioRiscosEnvioEmailHtml({
    empresaNome: empresaDemo,
    assetsBaseUrl: visualAssetsBaseUrl,
  });

  fs.writeFileSync(visualHtmlPath, visualHtml, "utf8");

  const productionBase = `https://${RISCOS_APP_PRODUCTION_HOST}`;
  const productionHtml = buildRelatorioRiscosEnvioEmailHtml({
    empresaNome: empresaDemo,
    assetsBaseUrl: productionBase,
  });
  fs.writeFileSync(
    path.join(outDir, "preview-riscos-relatorio-envio-email-producao.html"),
    productionHtml,
    "utf8"
  );

  const desktopShot = path.join(
    outDir,
    "preview-riscos-relatorio-envio-email-visual-desktop.png"
  );
  const mobileShot = path.join(
    outDir,
    "preview-riscos-relatorio-envio-email-visual-mobile.png"
  );

  const shotDesktop = await captureScreenshot(visualHtmlPath, desktopShot, {
    width: 800,
    height: 900,
  }).catch((err) => {
    console.warn("Screenshot desktop falhou:", err instanceof Error ? err.message : err);
    return false;
  });
  const shotMobile = await captureScreenshot(visualHtmlPath, mobileShot, {
    width: 390,
    height: 844,
  }).catch((err) => {
    console.warn("Screenshot mobile falhou:", err instanceof Error ? err.message : err);
    return false;
  });

  console.log("=== Preview visual do e-mail (Riscos Psicossociais) ===");
  console.log("");
  console.log("Assunto:", buildAssuntoRelatorioRiscosEmail(empresaDemo));
  console.log("Reply-To (config atual):", getResendReplyToAddress());
  console.log("Empresa fictícia:", empresaDemo);
  console.log("");
  console.log("HTML visual (artes locais /public):");
  console.log(" ", visualHtmlPath);
  console.log("  Cabeçalho:", visualAssetsBaseUrl + RISCOS_RELATORIO_EMAIL_ASSET_FILES.cabecalho);
  console.log("  Rodapé:", visualAssetsBaseUrl + RISCOS_RELATORIO_EMAIL_ASSET_FILES.rodape);
  console.log("");
  console.log("Como abrir:");
  console.log("  1. Duplo clique no HTML acima, ou");
  console.log(`  2. start "" "${visualHtmlPath}"`);
  console.log("  (Não precisa de npm run dev — imagens carregam de ../public/)");
  console.log("");
  if (shotDesktop) {
    console.log("Screenshot desktop:", desktopShot);
  }
  if (shotMobile) {
    console.log("Screenshot mobile:", mobileShot);
  }
  console.log("");
  console.log("URLs em produção (após deploy):");
  console.log(" ", productionBase + RISCOS_RELATORIO_EMAIL_ASSET_FILES.cabecalho);
  console.log(" ", productionBase + RISCOS_RELATORIO_EMAIL_ASSET_FILES.rodape);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
