import {
  loadImage,
  drawRoundRect,
  initStoryCanvas,
  downloadCanvasAsPng,
  drawStoryAttribution,
  drawStoryBrandHeader,
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
    requireFollowAccounts: ruleFields.requireFollowAccounts,
    requireComment: ruleFields.requireComment,
    requireLike: ruleFields.requireLike,
    requireSave: ruleFields.requireSave,
    requireFollowAccounts: ruleFields.requireFollowAccounts,
    requireMentionRule: ruleFields.requireMentionRule,
    maxMentions: ruleFields.maxMentions,
    maxCommentsPerUser: ruleFields.maxCommentsPerUser,
    allowMultipleCommentsBonus: ruleFields.allowMultipleCommentsBonus,
    requireStoryShare: ruleFields.requireStoryShare,
    requireStoryProofIfPrivate: ruleFields.requireStoryProofIfPrivate,
    requireMinAge: ruleFields.requireMinAge,
    minAge: ruleFields.minAge,
    requireRealActiveAccount: ruleFields.requireRealActiveAccount,
    disallowBusinessAccounts: ruleFields.disallowBusinessAccounts,
  };

  const { canvas, ctx, p } = initStoryCanvas(storyBackgroundId, 80, 1780);

  const PRIZE_IMAGE_SIZE = 156;
  const PRIZE_CARD_X = 130;
  const PRIZE_CARD_W = 820;
  const PRIZE_IMAGE_X = 150;
  const PRIZE_TEXT_X = PRIZE_IMAGE_X + PRIZE_IMAGE_SIZE + 28;
  const PRIZE_TEXT_MAX_WIDTH = PRIZE_CARD_X + PRIZE_CARD_W - PRIZE_TEXT_X - 24;
  const PRIZE_NAME_LINE_HEIGHT = 36;
  const PRIZE_META_FONT = '600 22px Inter';
  const PRIZE_NAME_FONT = 'bold 30px Inter';

  let y = await drawStoryBrandHeader(ctx, brand, p, 140, {
    raffleFallback: 'ÇEKİLİŞ DUYURUSU',
    raffleFont: 'bold 48px Outfit',
  });

  ctx.textAlign = 'center';
  ctx.font = '500 28px Inter';
  ctx.fillStyle = p.textMuted;
  ctx.fillText('Katılım şartları ve ödüller aşağıdadır', STORY_WIDTH / 2, y + 8);
  y += 48;

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

  const visiblePrizes = (prizes || []).slice(0, 4);

  for (let i = 0; i < visiblePrizes.length; i += 1) {
    const prize = visiblePrizes[i];
    const rowY = y;

    ctx.font = PRIZE_NAME_FONT;
    const prizeName = prize.name?.trim() || `${i + 1}. Ödül`;
    const nameLines = wrapText(ctx, prizeName, PRIZE_TEXT_MAX_WIDTH);
    const nameBlockHeight = nameLines.length * PRIZE_NAME_LINE_HEIGHT;
    const rowH = Math.max(PRIZE_IMAGE_SIZE + 32, nameBlockHeight + 56);

    ctx.fillStyle = p.cardFill;
    ctx.beginPath();
    drawRoundRect(ctx, PRIZE_CARD_X, rowY, PRIZE_CARD_W, rowH, 18);
    ctx.fill();

    if (prize.image) {
      try {
        const prizeImg = await loadImage(prize.image);
        ctx.drawImage(
          prizeImg,
          PRIZE_IMAGE_X,
          rowY + Math.max(16, (rowH - PRIZE_IMAGE_SIZE) / 2),
          PRIZE_IMAGE_SIZE,
          PRIZE_IMAGE_SIZE,
        );
      } catch {
        // resim yoksa metinle devam
      }
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = p.textPrimary;
    ctx.font = PRIZE_NAME_FONT;
    let textY = rowY + Math.max(28, (rowH - nameBlockHeight - 30) / 2) + 24;
    for (const line of nameLines) {
      ctx.fillText(line, PRIZE_TEXT_X, textY);
      textY += PRIZE_NAME_LINE_HEIGHT;
    }

    ctx.fillStyle = p.accent;
    ctx.font = PRIZE_META_FONT;
    ctx.fillText(
      `${prize.winnerCount || 1} asil · ${prize.substituteCount || 0} yedek`,
      PRIZE_TEXT_X,
      rowY + rowH - 22,
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

  drawStoryAttribution(ctx, p);

  downloadCanvasAsPng(canvas, 'cekilis_duyuru_story.png');
}
