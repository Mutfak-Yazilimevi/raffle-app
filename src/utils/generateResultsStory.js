import {
  loadImage,
  drawRoundRect,
  initStoryCanvas,
  downloadCanvasAsPng,
  wrapText,
  STORY_WIDTH,
} from './storyCanvas';

function findPrizeForPerson(person, prizes) {
  if (!prizes?.length) return null;
  if (person.prizeId) return prizes.find((p) => p.id === person.prizeId) || null;
  if (person.prizeName) return prizes.find((p) => p.name === person.prizeName) || null;
  return null;
}

async function drawPersonRow(ctx, person, prizes, y, options) {
  const { showPrizeProducts, isSubstitute, p } = options;
  const prize = findPrizeForPerson(person, prizes);
  const prizeName = person.prizeName || prize?.name || '';
  const rowH = showPrizeProducts && prize?.image ? 110 : isSubstitute ? 72 : 85;
  const rowX = isSubstitute ? 170 : 150;
  const rowW = isSubstitute ? 740 : 780;
  const radius = isSubstitute ? 15 : 20;

  ctx.fillStyle = isSubstitute ? p.cardFillLight : p.cardFill;
  ctx.beginPath();
  drawRoundRect(ctx, rowX, y - (isSubstitute ? 38 : 45), rowW, rowH, radius);
  ctx.fill();

  ctx.fillStyle = p.textPrimary;
  ctx.font = isSubstitute ? 'bold 28px Inter' : 'bold 32px Inter';
  ctx.textAlign = 'left';
  ctx.fillText(
    `${person.stepIndex || 1}. @${person.username}`,
    rowX + 40,
    y + 5
  );

  if (showPrizeProducts && prizeName) {
    const productX = rowX + rowW - 220;
    if (prize?.image) {
      try {
        const img = await loadImage(prize.image);
        const size = isSubstitute ? 52 : 64;
        ctx.drawImage(img, productX, y - (isSubstitute ? 30 : 38), size, size);
      } catch {
        // görsel yüklenemezse yalnızca metin
      }
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = p.accent;
    ctx.font = isSubstitute ? 'bold 20px Inter' : 'bold 22px Inter';
    const labelX = prize?.image ? productX + (isSubstitute ? 62 : 76) : productX;
    const lines = wrapText(ctx, `🎁 ${prizeName}`, 180);
    lines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, labelX, y + (i === 0 ? 2 : 24));
    });
  } else if (prizeName) {
    ctx.textAlign = 'right';
    ctx.fillStyle = p.accent;
    ctx.font = isSubstitute ? 'bold 20px Inter' : 'bold 22px Inter';
    const prizeText = prizeName.length > 28 ? `${prizeName.slice(0, 26)}...` : prizeName;
    ctx.fillText(`🎁 ${prizeText}`, rowX + rowW - 40, y + 5);
  } else if (person.comment?.trim()) {
    ctx.textAlign = 'right';
    ctx.fillStyle = p.textMuted;
    ctx.font = isSubstitute ? 'italic 20px Inter' : 'italic 22px Inter';
    const commentClean = person.comment.length > 25 ? `${person.comment.slice(0, 23)}...` : person.comment;
    ctx.fillText(`"${commentClean}"`, rowX + rowW - 40, y + 5);
  }

  return rowH + (isSubstitute ? 18 : 20);
}

export async function generateResultsStory({
  brand = {},
  prizes = [],
  winners = [],
  substitutes = [],
  showPrizeProducts = false,
  storyBackgroundId,
}) {
  const { canvas, ctx, p } = initStoryCanvas(storyBackgroundId, 120, 1680);

  let headerY = 200;

  if (brand?.logo) {
    try {
      const logoImg = await loadImage(brand.logo);
      const logoSize = 100;
      const aspect = logoImg.width / logoImg.height;
      let drawW = logoSize;
      let drawH = logoSize;
      if (aspect > 1) drawH = logoSize / aspect;
      else drawW = logoSize * aspect;
      ctx.drawImage(logoImg, STORY_WIDTH / 2 - drawW / 2, headerY, drawW, drawH);
      headerY += drawH + 20;
    } catch {
      // devam
    }
  }

  ctx.fillStyle = p.textPrimary;
  ctx.textAlign = 'center';
  ctx.font = 'bold 64px Outfit';

  const title = brand?.raffleName || 'ÇEKİLİŞ SONUÇLARI';
  const titleLines = wrapText(ctx, title.toUpperCase(), 820);
  titleLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, STORY_WIDTH / 2, headerY + 50 + i * 70);
  });
  headerY += Math.min(titleLines.length, 2) * 70 + 10;

  if (brand?.name) {
    ctx.font = '600 32px Inter';
    ctx.fillStyle = p.textSecondary;
    ctx.fillText(brand.name, STORY_WIDTH / 2, headerY + 20);
    headerY += 40;
  }

  ctx.font = '500 28px Inter';
  ctx.fillStyle = p.textMuted;
  ctx.fillText('Katılan ve Kazanan Herkesi Tebrik Ederiz!', STORY_WIDTH / 2, headerY + 30);

  ctx.strokeStyle = p.divider;
  ctx.beginPath();
  ctx.moveTo(150, headerY + 60);
  ctx.lineTo(930, headerY + 60);
  ctx.stroke();

  let currentY = headerY + 110;
  const maxWinnersToShow = showPrizeProducts ? 5 : 6;

  ctx.fillStyle = p.textPrimary;
  ctx.font = 'bold 40px Outfit';
  ctx.fillText('🏆 ASİL KAZANANLAR', STORY_WIDTH / 2, currentY);
  currentY += 60;

  for (const winner of winners.slice(0, maxWinnersToShow)) {
    const step = await drawPersonRow(ctx, winner, prizes, currentY, { showPrizeProducts, isSubstitute: false, p });
    currentY += step;
  }

  if (winners.length > maxWinnersToShow) {
    ctx.fillStyle = p.textSoft;
    ctx.font = 'bold 26px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(`+ ${winners.length - maxWinnersToShow} asil kazanan daha...`, STORY_WIDTH / 2, currentY);
    currentY += 30;
  }

  ctx.strokeStyle = p.divider;
  ctx.beginPath();
  ctx.moveTo(150, currentY + 10);
  ctx.lineTo(930, currentY + 10);
  ctx.stroke();

  currentY += 50;
  ctx.fillStyle = p.textPrimary;
  ctx.font = 'bold 40px Outfit';
  ctx.textAlign = 'center';
  ctx.fillText('⏱️ YEDEK KAZANANLAR', STORY_WIDTH / 2, currentY);
  currentY += 60;

  const maxSubstitutesToShow = showPrizeProducts ? 4 : 5;
  for (const sub of substitutes.slice(0, maxSubstitutesToShow)) {
    const step = await drawPersonRow(ctx, sub, prizes, currentY, { showPrizeProducts, isSubstitute: true, p });
    currentY += step;
  }

  if (substitutes.length > maxSubstitutesToShow) {
    ctx.fillStyle = p.textSoft;
    ctx.font = 'bold 26px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(`+ ${substitutes.length - maxSubstitutesToShow} yedek kazanan daha...`, STORY_WIDTH / 2, currentY);
  }

  ctx.fillStyle = p.textFaint;
  ctx.font = '600 24px Outfit';
  ctx.fillText('RaffleStudio', STORY_WIDTH / 2, 1750);

  downloadCanvasAsPng(canvas, 'cekilis_sonuclari_story.png');
}
