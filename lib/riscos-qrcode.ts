import QRCode from "qrcode";

const QR_DARK = "#0b1f4d";
const QR_LIGHT = "#ffffff";
const MUTED = "#64748b";
const ACCENT = "#2563eb";

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
 * Arte completa para compartilhamento (WhatsApp / mural / e-mail).
 * QR limpo no centro; textos e logo fora da área de leitura.
 */
export async function gerarQrCodeArteIdentificacaoDataUrl(input: {
  url: string;
  empresaNome: string;
  codigoPublico: string;
  logoUrl?: string | null;
}): Promise<string> {
  const canvasW = 1200;
  const padX = 72;
  const contentW = canvasW - padX * 2;

  const qrSize = Math.round(860 * 0.85);
  const qrCardPad = 28;
  const logoBox = Math.round(96 * 1.7);
  const nomeFontPx = 44;
  const nomeLineH = 50;
  const gapLogoNome = 16;
  const gapNomeCta = 32;
  const ctaLineH = 32;
  const gapCtaQr = 18;
  const gapQrCodigo = 22;

  const nome = (input.empresaNome.trim() || "Empresa").toUpperCase();
  const codigo = input.codigoPublico.trim().toUpperCase();

  const qrDataUrl = await gerarQrCodeDataUrl(input.url, qrSize);
  const qrImg = await loadImage(qrDataUrl);

  let logoImg: HTMLImageElement | null = null;
  if (input.logoUrl?.trim()) {
    try {
      logoImg = await loadImage(input.logoUrl.trim(), true);
    } catch {
      logoImg = null;
    }
  }

  const measureCanvas = document.createElement("canvas");
  const mctx = measureCanvas.getContext("2d");
  if (!mctx) throw new Error("Canvas indisponível.");

  const titleLines = ["QUESTIONÁRIO DE", "RISCOS PSICOSSOCIAIS"];
  const subtitle = "Avaliação do ambiente de trabalho";
  const cta = "ESCANEIE O QR CODE PARA PARTICIPAR";
  const footer = "Sua participação é importante.";

  mctx.font = `800 ${nomeFontPx}px system-ui, Segoe UI, Arial, sans-serif`;
  const nomeLines = wrapTextLines(mctx, nome, contentW, nomeLineH);

  const yTitle = 72;
  const titleLineH = 58;
  const ySubtitle = yTitle + titleLines.length * titleLineH + 18;
  const yRule = ySubtitle + 44;
  const yLogo = yRule + 40;
  const yNome = logoImg ? yLogo + logoBox + gapLogoNome : yLogo + 8;
  const yCta = yNome + nomeLines.length * nomeLineH + gapNomeCta;
  const yQrCard = yCta + ctaLineH + gapCtaQr;
  const yQr = yQrCard + qrCardPad;
  const yCodigoLabel = yQr + qrSize + qrCardPad + gapQrCodigo;
  const yCodigo = yCodigoLabel + 36;
  const yFooter = yCodigo + 56;
  const canvasH = yFooter + 64;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = QR_DARK;
  ctx.fillRect(0, 0, canvasW, 12);

  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  ctx.fillStyle = QR_DARK;
  ctx.font = "800 52px system-ui, Segoe UI, Arial, sans-serif";
  titleLines.forEach((line, i) => {
    ctx.fillText(line, canvasW / 2, yTitle + i * titleLineH);
  });

  ctx.fillStyle = MUTED;
  ctx.font = "600 28px system-ui, Segoe UI, Arial, sans-serif";
  ctx.fillText(subtitle, canvasW / 2, ySubtitle);

  const ruleW = 160;
  ctx.fillStyle = ACCENT;
  ctx.fillRect((canvasW - ruleW) / 2, yRule, ruleW, 4);

  if (logoImg) {
    const maxLogo = logoBox;
    const scale = Math.min(
      maxLogo / Math.max(1, logoImg.naturalWidth),
      maxLogo / Math.max(1, logoImg.naturalHeight)
    );
    const lw = Math.max(1, Math.round(logoImg.naturalWidth * scale));
    const lh = Math.max(1, Math.round(logoImg.naturalHeight * scale));
    const lx = Math.round((canvasW - lw) / 2);
    const ly = Math.round(yLogo + (maxLogo - lh) / 2);

    const pad = 8;
    roundRect(ctx, lx - pad, ly - pad, lw + pad * 2, lh + pad * 2, 12);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(logoImg, lx, ly, lw, lh);
  }

  ctx.fillStyle = QR_DARK;
  ctx.font = `800 ${nomeFontPx}px system-ui, Segoe UI, Arial, sans-serif`;
  nomeLines.forEach((line, i) => {
    ctx.fillText(line, canvasW / 2, yNome + i * nomeLineH);
  });

  ctx.fillStyle = ACCENT;
  ctx.font = "700 26px system-ui, Segoe UI, Arial, sans-serif";
  ctx.fillText(cta, canvasW / 2, yCta);

  const qrX = Math.round((canvasW - qrSize) / 2);
  const cardX = qrX - qrCardPad;
  const cardY = yQr - qrCardPad;
  const cardSize = qrSize + qrCardPad * 2;
  roundRect(ctx, cardX, cardY, cardSize, cardSize, 24);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#e8edf5";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrImg, qrX, yQr, qrSize, qrSize);
  ctx.imageSmoothingEnabled = true;

  ctx.fillStyle = MUTED;
  ctx.font = "600 24px system-ui, Segoe UI, Arial, sans-serif";
  ctx.fillText("Código da campanha", canvasW / 2, yCodigoLabel);

  ctx.fillStyle = QR_DARK;
  ctx.font = "800 40px ui-monospace, Consolas, monospace";
  ctx.fillText(codigo || "—", canvasW / 2, yCodigo);

  ctx.fillStyle = MUTED;
  ctx.font = "600 24px system-ui, Segoe UI, Arial, sans-serif";
  ctx.fillText(footer, canvasW / 2, yFooter);

  return canvas.toDataURL("image/png");
}

function loadImage(
  src: string,
  crossOrigin = false
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem."));
    img.src = src;
  });
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  _lineHeight: number
): string[] {
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
  return lines.length > 0 ? lines : [text];
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
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
