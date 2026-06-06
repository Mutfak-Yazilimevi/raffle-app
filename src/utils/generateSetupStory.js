import {
  loadImage,
  drawRoundRect,
  initStoryCanvas,
  downloadCanvasAsPng,
  wrapText,
  STORY_WIDTH,
} from './storyCanvas';
import { getRulesSummaryLines } from './raffleConfigFile';

export async function generateSetupStory(state) {
  const { brand, prizes, storyBackgroundId, ...ruleFields } = state;
  const rules = {
    entryMethod: ruleFields.entryMethod,
    minMentions: ruleFields.minMentions,
    mentionMode: ruleFields.mentionMode,
    weightedEntry: ruleFields.weightedEntry,
    uniqueMentions: ruleFields.uniqueMentions,
    keywordRequired: ruleFields.keywordRequired,
    keywordBlacklist: ruleFields.keywordBlacklist,
    userBlacklist: ruleFields.userBlacklist,
    requiredFollowAccounts: ruleFields.requiredFollowAccounts,
    minRequiredFollows: ruleFields.minRequiredFollows,
  };

  const { canvas, ctx, p } = initStoryCanvas(storyBackgroundId, 100, 1720);

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
  ctx.fillStyle = p.textPrimary;
  ctx.font = 'bold 68px Outfit';

  const title = brand?.raffleName || 'ÇEKİLİŞ DUYURUSU';
  const titleLines = wrapText(ctx, title.toUpperCase(), 820);
  for (const line of titleLines.slice(0, 2)) {
    ctx.fillText(line, STORY_WIDTH / 2, y);
    y += 72;
  }

  if (brand?.name) {
    ctx.font = '600 34px Inter';
    ctx.fillStyle = p.textSecondary;
    ctx.fillText(brand.name, STORY_WIDTH / 2, y + 10);
    y += 50;
  }

  ctx.font = '500 28px Inter';
  ctx.fillStyle = p.textMuted;
  ctx.fillText('Katılım şartları ve ödüller aşağıdadır', STORY_WIDTH / 2, y + 20);
  y += 60;

  ctx.strokeStyle = p.divider;
  ctx.beginPath();
  ctx.moveTo(140, y);
  ctx.lineTo(940, y);
  ctx.stroke();
  y += 50;

  ctx.fillStyle = p.accent;
  ctx.font = 'bold 42px Outfit';
  ctx.fillText('🎁 ÖDÜLLER', STORY_WIDTH / 2, y);
  y += 50;

  const visiblePrizes = (prizes || []).slice(0, 6);

  for (let i = 0; i < visiblePrizes.length; i += 1) {
    const prize = visiblePrizes[i];
    const rowH = 110;
    const rowY = y;

    ctx.fillStyle = p.cardFill;
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
    ctx.fillStyle = p.textPrimary;
    ctx.font = 'bold 30px Inter';
    const prizeName = prize.name || `${i + 1}. Ödül`;
    ctx.fillText(prizeName.length > 28 ? `${prizeName.slice(0, 26)}...` : prizeName, textX, rowY + 48);

    ctx.fillStyle = p.accent;
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
    ctx.fillStyle = p.textSoft;
    ctx.font = '600 24px Inter';
    ctx.fillText(`+ ${prizes.length - visiblePrizes.length} ödül daha`, STORY_WIDTH / 2, y + 10);
    y += 40;
  }

  y += 20;
  ctx.strokeStyle = p.divider;
  ctx.beginPath();
  ctx.moveTo(140, y);
  ctx.lineTo(940, y);
  ctx.stroke();
  y += 45;

  ctx.textAlign = 'center';
  ctx.fillStyle = p.textPrimary;
  ctx.font = 'bold 36px Outfit';
  ctx.fillText('📋 KATILIM KURALLARI', STORY_WIDTH / 2, y);
  y += 45;

  const ruleLines = getRulesSummaryLines(rules || {}).slice(0, 6);
  ctx.textAlign = 'left';
  ctx.font = '500 26px Inter';

  for (const line of ruleLines) {
    ctx.fillStyle = p.cardFillLight;
    ctx.beginPath();
    drawRoundRect(ctx, 150, y - 28, 780, 52, 14);
    ctx.fill();

    ctx.fillStyle = p.textSecondary;
    ctx.fillText(`• ${line}`, 180, y + 2);
    y += 62;
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = p.textFaint;
  ctx.font = '600 24px Outfit';
  ctx.fillText('instagram-cekilis-uygulamasi.github.io', STORY_WIDTH / 2, 1780);

  downloadCanvasAsPng(canvas, 'cekilis_duyuru_story.png');
}
