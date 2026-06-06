import {
  STORY_WIDTH,
  STORY_HEIGHT,
  loadImage,
  drawRoundRect,
  drawStoryBackground,
  drawStoryGlassCard,
  downloadCanvasAsPng,
  wrapText,
} from './storyCanvas';
import { getRulesSummaryLines } from './raffleConfigFile';

export async function generateSetupStory(state) {
  const { brand, prizes, ...ruleFields } = state;
  const rules = {
    entryMethod: ruleFields.entryMethod,
    minMentions: ruleFields.minMentions,
    mentionMode: ruleFields.mentionMode,
    weightedEntry: ruleFields.weightedEntry,
    uniqueMentions: ruleFields.uniqueMentions,
    keywordRequired: ruleFields.keywordRequired,
    keywordBlacklist: ruleFields.keywordBlacklist,
    userBlacklist: ruleFields.userBlacklist,
  };

  const canvas = document.createElement('canvas');
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext('2d');

  drawStoryBackground(ctx);
  drawStoryGlassCard(ctx, 100, 1720);

  let y = 180;

  if (brand?.logo) {
    try {
      const logoImg = await loadImage(brand.logo);
      const logoSize = 110;
      const aspect = logoImg.width / logoImg.height;
      let drawW = logoSize;
      let drawH = logoSize;
      if (aspect > 1) drawH = logoSize / aspect;
      else drawW = logoSize * aspect;
      ctx.drawImage(logoImg, STORY_WIDTH / 2 - drawW / 2, y, drawW, drawH);
      y += drawH + 24;
    } catch {
      // logo yüklenemezse devam et
    }
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 68px Outfit';

  const title = brand?.raffleName || 'ÇEKİLİŞ DUYURUSU';
  const titleLines = wrapText(ctx, title.toUpperCase(), 820);
  for (const line of titleLines.slice(0, 2)) {
    ctx.fillText(line, STORY_WIDTH / 2, y);
    y += 72;
  }

  if (brand?.name) {
    ctx.font = '600 34px Inter';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.fillText(brand.name, STORY_WIDTH / 2, y + 10);
    y += 50;
  }

  ctx.font = '500 28px Inter';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.fillText('Katılım şartları ve ödüller aşağıdadır', STORY_WIDTH / 2, y + 20);
  y += 60;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.moveTo(140, y);
  ctx.lineTo(940, y);
  ctx.stroke();
  y += 50;

  ctx.fillStyle = '#fccc63';
  ctx.font = 'bold 42px Outfit';
  ctx.fillText('🎁 ÖDÜLLER', STORY_WIDTH / 2, y);
  y += 50;

  const visiblePrizes = (prizes || []).slice(0, 6);

  for (let i = 0; i < visiblePrizes.length; i += 1) {
    const prize = visiblePrizes[i];
    const rowH = 110;
    const rowY = y;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    drawRoundRect(ctx, 130, rowY, 820, rowH, 18);
    ctx.fill();

    let textX = 170;

    if (prize.image) {
      try {
        const prizeImg = await loadImage(prize.image);
        const size = 78;
        ctx.drawImage(prizeImg, 150, rowY + 16, size, size);
        textX = 250;
      } catch {
        // resim yoksa metinle devam
      }
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Inter';
    const prizeName = prize.name || `${i + 1}. Ödül`;
    ctx.fillText(prizeName.length > 28 ? `${prizeName.slice(0, 26)}...` : prizeName, textX, rowY + 48);

    ctx.fillStyle = '#fccc63';
    ctx.font = '600 22px Inter';
    ctx.fillText(
      `${prize.winnerCount || 1} asil · ${prize.substituteCount || 0} yedek`,
      textX,
      rowY + 78
    );

    y += rowH + 16;
  }

  if ((prizes || []).length > visiblePrizes.length) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = '600 24px Inter';
    ctx.fillText(`+ ${prizes.length - visiblePrizes.length} ödül daha`, STORY_WIDTH / 2, y + 10);
    y += 40;
  }

  y += 20;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.moveTo(140, y);
  ctx.lineTo(940, y);
  ctx.stroke();
  y += 45;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Outfit';
  ctx.fillText('📋 KATILIM KURALLARI', STORY_WIDTH / 2, y);
  y += 45;

  const ruleLines = getRulesSummaryLines(rules || {}).slice(0, 6);
  ctx.textAlign = 'left';
  ctx.font = '500 26px Inter';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';

  for (const line of ruleLines) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    drawRoundRect(ctx, 150, y - 28, 780, 52, 14);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillText(`• ${line}`, 180, y + 2);
    y += 62;
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '600 24px Outfit';
  ctx.fillText('instagram-cekilis-uygulamasi.github.io', STORY_WIDTH / 2, 1780);

  downloadCanvasAsPng(canvas, 'cekilis_duyuru_story.png');
}
