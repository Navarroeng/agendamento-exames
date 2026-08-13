import QRCode from "qrcode";

const QR_DARK = "#0b1f4d";
const QR_LIGHT = "#ffffff";

/** QR limpo (só módulos) — alta resolução para impressão. */
export async function gerarQrCodeDataUrl(
  url: string,
  sizePx = 1000
): Promise<string> {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 4,
    width: sizePx,
    color: {
      dark: QR_DARK,
      light: QR_LIGHT,
    },
  });
}

/**
 * Arte branca com identificação (empresa + QR + código).
 * O QR permanece limpo; textos ficam fora da área de leitura.
 */
export async function gerarQrCodeArteIdentificacaoDataUrl(input: {
  url: string;
  empresaNome: string;
  codigoPublico: string;
}): Promise<string> {
  const qrSize = 1000;
  const padX = 80;
  const padTop = 120;
  const padBottom = 160;
  const gap = 48;
  const canvasW = qrSize + padX * 2;
  const canvasH = padTop + qrSize + gap + padBottom;

  const qrDataUrl = await gerarQrCodeDataUrl(input.url, qrSize);
  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.fillStyle = QR_DARK;
  ctx.font = "700 42px system-ui, Segoe UI, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const nome = input.empresaNome.trim() || "Empresa";
  wrapText(ctx, nome.toUpperCase(), canvasW / 2, padTop / 2, canvasW - padX * 2, 48);

  const img = await loadImage(qrDataUrl);
  ctx.drawImage(img, padX, padTop, qrSize, qrSize);

  const yMeta = padTop + qrSize + gap + 36;
  ctx.fillStyle = "#64748b";
  ctx.font = "600 28px system-ui, Segoe UI, Arial, sans-serif";
  ctx.fillText("Campanha", canvasW / 2, yMeta);

  ctx.fillStyle = QR_DARK;
  ctx.font = "800 44px ui-monospace, Consolas, monospace";
  ctx.fillText(input.codigoPublico.trim().toUpperCase(), canvasW / 2, yMeta + 52);

  return canvas.toDataURL("image/png");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar QR."));
    img.src = src;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => {
    ctx.fillText(l, x, startY + i * lineHeight);
  });
}

export function baixarDataUrlPng(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
