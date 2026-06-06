import {
  loadImage,
  drawRoundRect,
  initStoryCanvas,
  downloadCanvasAsPng,
  wrapText,
  STORY_WIDTH,
} from './storyCanvas';

function drawWinnerBadge(ctx, text, centerY, colors) {
  ctx.font = 'bold 48px Outfit';
  const metrics = ctx.measureText(text);
  const padX = 40;
  const w = metrics.width + padX * 2;
  const h = 80;
  const x = STORY_WIDTH / 2 - w / 2;
  const y = centerY - h / 2;

  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(1, colors[1]);
  ctx.fillStyle = grad;
  ctx.beginPath();
  drawRoundRect(ctx, x, y, w, h, 40);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, STORY_WIDTH / 2, centerY + 2);
  ctx.textBaseline = 'alphabetic';
}

/** Tek bir talihli / kazanan için Instagram story görseli üretir. */
export async function generateWinnerStory({
  brand,
  prize,
  winner,
  drawType = 'asil',
  stepIndex = 1,
  storyBackgroundId,
}) {
  const isAsil = drawType === 'asil';
  const badgeLabel = isAsil ? `${stepIndex}. ASİL KAZANAN` : `${stepIndex}. YEDEK KAZANAN`;
  const headline = isAsil ? 'TALİHLİ!' : 'YEDEK TALİHLİ!';
  const badgeColors = isAsil ? ['#f91f79', '#e1306c'] : ['#fbad50', '#e1306c'];

  const { canvas, ctx, theme, p } = initStoryCanvas(storyBackgroundId, 100, 1720);

  ctx.strokeStyle = isAsil ? 'rgba(252, 204, 99, 0.4)' : 'rgba(251, 173, 80, 0.35)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(STORY_WIDTH / 2, 680, 300, 0, Math.PI * 2);
  ctx.stroke();

  let y = 160;

  if (brand?.logo) {
    try {
      const logoImg = await loadImage(brand.logo);
      const logoSize = 90;
      const aspect = logoImg.width / logoImg.height;
      let drawW = logoSize;
      let drawH = logoSize;
      if (aspect > 1) drawH = logoSize / aspect;
      else drawW = logoSize * aspect;
      ctx.drawImage(logoImg, STORY_WIDTH / 2 - drawW / 2, y, drawW, drawH);
      y += drawH + 24;
    } catch {
      // devam
    }
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = p.textSecondary;
  ctx.font = '600 30px Inter';
  if (brand?.raffleName) {
    const titleLines = wrapText(ctx, brand.raffleName.toUpperCase(), 860);
    for (const line of titleLines.slice(0, 2)) {
      ctx.fillText(line, STORY_WIDTH / 2, y);
      y += 38;
    }
  }
  if (brand?.name) {
    ctx.fillStyle = p.textMuted;
    ctx.font = '500 26px Inter';
    ctx.fillText(brand.name, STORY_WIDTH / 2, y + 8);
    y += 40;
  }

  drawWinnerBadge(ctx, badgeLabel, y + 50, badgeColors);
  y += 110;

  ctx.fillStyle = p.accent;
  ctx.font = 'bold 72px Outfit';
  ctx.fillText(headline, STORY_WIDTH / 2, y + 20);
  y += 90;

  ctx.fillStyle = p.textPrimary;
  ctx.font = 'bold 80px Outfit';
  const username = `@${winner.username}`;
  ctx.fillText(username.length > 16 ? `@${winner.username.slice(0, 14)}…` : username, STORY_WIDTH / 2, y + 30);
  y += 100;

  const prizeName = prize?.name || (isAsil ? 'Ödül' : 'Yedek Ödül');
  const prizeBoxY = y + 20;
  const prizeBoxH = prize?.image ? 260 : 160;

  ctx.fillStyle = p.cardFill;
  ctx.beginPath();
  drawRoundRect(ctx, 120, prizeBoxY, STORY_WIDTH - 240, prizeBoxH, 24);
  ctx.fill();

  ctx.strokeStyle = theme.glass.stroke;
  ctx.lineWidth = 3;
  ctx.stroke();

  if (prize?.image) {
    try {
      const img = await loadImage(prize.image);
      const size = 180;
      ctx.drawImage(img, STORY_WIDTH / 2 - size / 2, prizeBoxY + 24, size, size);
    } catch {
      // devam
    }
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = p.accent;
  ctx.font = 'bold 36px Inter';
  const prizeLines = wrapText(ctx, `🎁 ${prizeName}`, 780);
  const prizeTextY = prize?.image ? prizeBoxY + prizeBoxH - 52 : prizeBoxY + prizeBoxH / 2 + 12;
  for (const line of prizeLines.slice(0, 2)) {
    ctx.fillText(line, STORY_WIDTH / 2, prizeTextY);
  }

  y = prizeBoxY + prizeBoxH + 50;

  if (winner.comment?.trim()) {
    ctx.fillStyle = p.textMuted;
    ctx.font = 'italic 28px Inter';
    const comment = `"${winner.comment.trim()}"`;
    const commentLines = wrapText(ctx, comment.length > 120 ? `${comment.slice(0, 118)}…"` : comment, 820);
    for (const line of commentLines.slice(0, 3)) {
      ctx.fillText(line, STORY_WIDTH / 2, y);
      y += 38;
    }
    y += 20;
  }

  ctx.strokeStyle = p.divider;
  ctx.beginPath();
  ctx.moveTo(140, y);
  ctx.lineTo(940, y);
  ctx.stroke();
  y += 44;

  ctx.fillStyle = p.textSecondary;
  ctx.font = '500 30px Inter';
  ctx.fillText(
    isAsil ? 'Tebrikler! Ödülünüz için sizinle iletişime geçilecektir.' : 'Yedek kazanan olarak listedesiniz.',
    STORY_WIDTH / 2,
    y
  );

  ctx.fillStyle = p.textFaint;
  ctx.font = '600 24px Outfit';
  ctx.fillText('RaffleStudio', STORY_WIDTH / 2, 1780);

  const slug = winner.username.replace(/[^a-z0-9._-]/gi, '_').slice(0, 20);
  downloadCanvasAsPng(canvas, `talihli_${slug}_story.png`);
}
