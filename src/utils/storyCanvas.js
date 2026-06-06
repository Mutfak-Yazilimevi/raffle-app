import { resolveStoryTheme } from './storyBackgrounds';
import { STORY_ATTRIBUTION } from './appBranding';

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

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
export async function drawStoryBrandHeader(ctx, brand, p, startY = 130, options = {}) {
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

/** Story görsellerinin altına marka ifadesi ekler */
export function drawStoryAttribution(ctx, p, baseY = 1770) {
  ctx.textAlign = 'center';
  ctx.fillStyle = p.textFaint;
  ctx.font = '500 22px Inter';
  const lines = wrapText(ctx, STORY_ATTRIBUTION, 860);
  let y = baseY - (lines.length - 1) * 30;
  for (const line of lines) {
    ctx.fillText(line, STORY_WIDTH / 2, y);
    y += 30;
  }
}
