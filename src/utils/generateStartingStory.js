import {
  loadImage,
  drawRoundRect,
  initStoryCanvas,
  downloadCanvasAsPng,
  drawStoryAttribution,
  drawStoryBrandHeader,
  STORY_WIDTH,
} from './storyCanvas';
import { formatScheduleDateTime } from './raffleSchedule';

function drawBadge(ctx, text, centerY) {
  ctx.font = 'bold 52px Outfit';
  const metrics = ctx.measureText(text);
  const padX = 48;
  const padY = 28;
  const w = metrics.width + padX * 2;
  const h = 72 + padY;
  const x = STORY_WIDTH / 2 - w / 2;
  const y = centerY - h / 2;

  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, '#f91f79');
  grad.addColorStop(1, '#e1306c');
  ctx.fillStyle = grad;
  ctx.beginPath();
  drawRoundRect(ctx, x, y, w, h, 36);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, STORY_WIDTH / 2, centerY + 4);
  ctx.textBaseline = 'alphabetic';
}

export async function generateStartingStory(state, stats = {}) {
  const { brand, prizes, storyBackgroundId } = state;
  const participantCount = stats.participantCount ?? 0;
  const ticketCount = stats.ticketCount ?? 0;
  const prizeCount = stats.prizeCount ?? (prizes?.length || 0);

  const { canvas, ctx, p } = initStoryCanvas(storyBackgroundId, 80, 1760);

  let y = await drawStoryBrandHeader(ctx, brand, p, 120, {
    raffleFallback: 'BÜYÜK ÇEKİLİŞ',
    raffleFont: 'bold 46px Outfit',
    bottomGap: 16,
  });

  drawBadge(ctx, 'ÇEKİLİŞ BAŞLIYOR!', y + 36);
  y += 108;

  ctx.textAlign = 'center';
  ctx.font = '500 30px Inter';
  ctx.fillStyle = p.accent;
  ctx.fillText('🎬 Canlı çekiliş şimdi başlıyor!', STORY_WIDTH / 2, y + 8);
  y += 56;

  ctx.strokeStyle = p.divider;
  ctx.beginPath();
  ctx.moveTo(140, y);
  ctx.lineTo(940, y);
  ctx.stroke();
  y += 50;

  const statItems = [
    { label: 'Katılımcı', value: participantCount > 0 ? participantCount : '—' },
    { label: 'Toplam Bilet', value: ticketCount > 0 ? ticketCount : '—' },
    { label: 'Ödül Sayısı', value: prizeCount || (prizes?.length || 0) },
  ];

  const statW = 250;
  const statGap = 30;
  const statStartX = STORY_WIDTH / 2 - (statItems.length * statW + (statItems.length - 1) * statGap) / 2;

  statItems.forEach((item, i) => {
    const x = statStartX + i * (statW + statGap);
    ctx.fillStyle = p.cardFill;
    ctx.beginPath();
    drawRoundRect(ctx, x, y, statW, 110, 16);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = p.textSoft;
    ctx.font = '600 22px Inter';
    ctx.fillText(item.label, x + statW / 2, y + 38);

    ctx.fillStyle = p.textPrimary;
    ctx.font = 'bold 40px Outfit';
    ctx.fillText(String(item.value), x + statW / 2, y + 82);
  });

  y += 150;

  ctx.fillStyle = p.textPrimary;
  ctx.font = 'bold 38px Outfit';
  ctx.fillText('🎁 VERİLECEK ÖDÜLLER', STORY_WIDTH / 2, y);
  y += 45;

  const visiblePrizes = (prizes || []).slice(0, 4);
  const cols = Math.min(visiblePrizes.length, 2);
  const cellW = 380;
  const cellH = 200;
  const gridW = cols * cellW + (cols - 1) * 24;
  const startX = STORY_WIDTH / 2 - gridW / 2;

  for (let i = 0; i < visiblePrizes.length; i += 1) {
    const prize = visiblePrizes[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (cellW + 24);
    const cellY = y + row * (cellH + 20);

    ctx.fillStyle = p.cardFill;
    ctx.beginPath();
    drawRoundRect(ctx, x, cellY, cellW, cellH, 18);
    ctx.fill();

    if (prize.image) {
      try {
        const img = await loadImage(prize.image);
        const size = 90;
        ctx.drawImage(img, x + 20, cellY + 20, size, size);
      } catch {
        // devam
      }
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = p.textPrimary;
    ctx.font = 'bold 28px Inter';
    const name = prize.name || `${i + 1}. Ödül`;
    ctx.fillText(name.length > 18 ? `${name.slice(0, 16)}...` : name, x + 120, cellY + 55);

    ctx.fillStyle = p.accent;
    ctx.font = '600 22px Inter';
    ctx.fillText(`${prize.winnerCount || 1} asil · ${prize.substituteCount || 0} yedek`, x + 120, cellY + 95);
  }

  if ((prizes || []).length > visiblePrizes.length) {
    y += Math.ceil(visiblePrizes.length / cols) * (cellH + 20) + 10;
    ctx.textAlign = 'center';
    ctx.fillStyle = p.textSoft;
    ctx.font = '600 24px Inter';
    ctx.fillText(`+ ${prizes.length - visiblePrizes.length} ödül daha`, STORY_WIDTH / 2, y);
  } else {
    y += Math.ceil(visiblePrizes.length / cols) * (cellH + 20);
  }

  y += 50;
  ctx.textAlign = 'center';
  ctx.fillStyle = p.textMuted;
  ctx.font = '500 28px Inter';
  ctx.fillText('Bol şans! Kazananlar birazdan açıklanacak.', STORY_WIDTH / 2, y);

  const drawLabel = formatScheduleDateTime(brand?.drawDate, brand?.drawTime);
  if (drawLabel) {
    y += 44;
    ctx.fillStyle = p.textSoft;
    ctx.font = '600 24px Inter';
    ctx.fillText(`Çekiliş: ${drawLabel}`, STORY_WIDTH / 2, y);
  }

  if (brand?.postUrl?.trim()) {
    y += 44;
    ctx.fillStyle = p.textSoft;
    ctx.font = '600 22px Inter';
    ctx.fillText('Çekiliş gönderisi profilde / hikayede', STORY_WIDTH / 2, y);
  }

  drawStoryAttribution(ctx, p);

  downloadCanvasAsPng(canvas, 'cekilis_basliyor_story.png');
}
