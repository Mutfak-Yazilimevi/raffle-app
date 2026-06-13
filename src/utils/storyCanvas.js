import { resolveStoryTheme } from './storyBackgrounds';
import { APP_TAGLINE, STORY_ATTRIBUTION } from './appBranding';

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

const INSTA_GRADIENT_STOPS = [
  [0, '#f91f79'],
  [0.5, '#b92b97'],
  [1, '#773cb5'],
];

function createInstaGradient(ctx, x0, y0, x1, y1) {
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  INSTA_GRADIENT_STOPS.forEach(([stop, color]) => grad.addColorStop(stop, color));
  return grad;
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function drawRoundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

export function drawStoryBackground(ctx, theme) {
  const { gradient, orbs } = theme.background;
  const grad = ctx.createLinearGradient(0, 0, STORY_WIDTH, STORY_HEIGHT);
  gradient.forEach((color, index) => {
    const stop = gradient.length === 1 ? 0 : index / (gradient.length - 1);
    grad.addColorStop(stop, color);
  });
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  for (const orb of orbs) {
    ctx.fillStyle = orb.color;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawStoryGlassCard(ctx, cardY = 120, cardH = 1680, theme) {
  const cardX = 80;
  const cardW = 920;
  const cardR = 40;
  const { fill, stroke } = theme.glass;

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 4;
  ctx.beginPath();
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.fill();
  ctx.stroke();
}

export function initStoryCanvas(storyBackgroundId, cardY = 120, cardH = 1680) {
  const theme = resolveStoryTheme(storyBackgroundId);
  const canvas = document.createElement('canvas');
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext('2d');
  drawStoryBackground(ctx, theme);
  drawStoryGlassCard(ctx, cardY, cardH, theme);
  return { canvas, ctx, theme, p: theme.palette };
}

export function downloadCanvasAsPng(canvas, filename) {
  const url = canvas.toDataURL('image/png');
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';

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
  return lines;
}

/**
 * Story üst bilgisi: Logo → Marka Adı → Çekiliş Adı
 * @returns {Promise<number>} alt içerik için başlangıç Y değeri
 */
export async function awaitFonts() {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready;
  }
}

export async function drawStoryBrandHeader(ctx, brand, p, startY = 130, options = {}) {
  await awaitFonts();
  const {
    logoMaxSize = 96,
    logoGap = 22,
    brandFont = '600 30px Inter',
    brandGap = 20,
    raffleFont = 'bold 50px Outfit',
    raffleMaxWidth = 820,
    raffleMaxLines = 2,
    raffleLineHeight = 56,
    bottomGap = 24,
    raffleFallback = 'ÇEKİLİŞ',
  } = options;

  let y = startY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (brand?.logo) {
    try {
      const logoImg = await loadImage(brand.logo);
      const aspect = logoImg.width / logoImg.height;
      let drawW = logoMaxSize;
      let drawH = logoMaxSize;
      if (aspect > 1) drawH = logoMaxSize / aspect;
      else drawW = logoMaxSize * aspect;
      ctx.drawImage(logoImg, STORY_WIDTH / 2 - drawW / 2, y, drawW, drawH);
      y += drawH + logoGap;
    } catch {
      // logo yüklenemezse devam
    }
  }

  const brandName = brand?.name?.trim();
  if (brandName) {
    ctx.font = brandFont;
    ctx.fillStyle = p.textSecondary;
    ctx.fillText(brandName, STORY_WIDTH / 2, y + 26);
    y += 26 + brandGap;
  }

  const raffleLabel = (brand?.raffleName?.trim() || raffleFallback).toUpperCase();
  ctx.font = raffleFont;
  ctx.fillStyle = p.textPrimary;
  const raffleLines = wrapText(ctx, raffleLabel, raffleMaxWidth);
  for (const line of raffleLines.slice(0, raffleMaxLines)) {
    ctx.fillText(line, STORY_WIDTH / 2, y + 34);
    y += raffleLineHeight;
  }

  return y + bottomGap;
}

function drawAwardMark(ctx, cx, cy, size) {
  const scale = size / 24;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(-7, -6);
  ctx.lineTo(7, -6);
  ctx.lineTo(5, 5);
  ctx.quadraticCurveTo(0, 9, -5, 5);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(-9, -2, 3.2, Math.PI * 0.5, Math.PI * 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(9, -2, 3.2, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-3, 9);
  ctx.lineTo(-3, 11);
  ctx.lineTo(3, 11);
  ctx.lineTo(3, 9);
  ctx.stroke();

  ctx.restore();
}

/** Story alt bilgisinde MutfakRaffleStudio logosu (uygulama başlığı ile aynı stil) */
export function drawStoryAppLogo(ctx, p, centerX, baseY, options = {}) {
  const { scale = 1, showTagline = false } = options;
  const iconSize = 42 * scale;
  const gap = 12 * scale;
  const nameSize = 24 * scale;
  const taglineSize = 12 * scale;

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  ctx.font = `800 ${nameSize}px Outfit, Inter, sans-serif`;
  const mutfakWidth = ctx.measureText('Mutfak').width;
  const raffleWidth = ctx.measureText('RaffleStudio').width;
  const wordmarkWidth = mutfakWidth + raffleWidth;
  const totalWidth = iconSize + gap + wordmarkWidth;
  const startX = centerX - totalWidth / 2;
  const iconY = baseY - iconSize;
  const textY = baseY - iconSize / 2;

  const iconGrad = createInstaGradient(ctx, startX, iconY, startX + iconSize, iconY + iconSize);
  ctx.fillStyle = iconGrad;
  ctx.beginPath();
  drawRoundRect(ctx, startX, iconY, iconSize, iconSize, 11 * scale);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  drawAwardMark(ctx, startX + iconSize / 2, iconY + iconSize / 2, iconSize * 0.52);

  let textX = startX + iconSize + gap;
  ctx.fillStyle = p.textSecondary;
  ctx.fillText('Mutfak', textX, textY);
  textX += mutfakWidth;

  ctx.fillStyle = createInstaGradient(ctx, textX, textY - nameSize / 2, textX + raffleWidth, textY + nameSize / 2);
  ctx.fillText('RaffleStudio', textX, textY);

  if (showTagline) {
    ctx.textAlign = 'center';
    ctx.font = `500 ${taglineSize}px Inter, sans-serif`;
    ctx.fillStyle = p.textFaint;
    ctx.fillText(APP_TAGLINE, centerX, baseY + 10 * scale);
  }

  ctx.restore();

  return iconSize + (showTagline ? 18 * scale : 0);
}

/** Story görsellerinin altına logo + marka ifadesi ekler */
export function drawStoryAttribution(ctx, p, baseY = 1770) {
  ctx.font = '500 22px Inter';
  ctx.textAlign = 'center';
  const lines = wrapText(ctx, STORY_ATTRIBUTION, 860);
  const textBlockHeight = lines.length * 30;
  const logoGap = 16;
  const logoBaseY = baseY - textBlockHeight - logoGap;

  drawStoryAppLogo(ctx, p, STORY_WIDTH / 2, logoBaseY, { scale: 1.02 });

  ctx.fillStyle = p.textFaint;
  let y = baseY - (lines.length - 1) * 30;
  for (const line of lines) {
    ctx.fillText(line, STORY_WIDTH / 2, y);
    y += 30;
  }
}
