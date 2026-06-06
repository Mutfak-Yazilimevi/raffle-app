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

export function drawStoryBackground(ctx) {
  const grad = ctx.createLinearGradient(0, 0, STORY_WIDTH, STORY_HEIGHT);
  grad.addColorStop(0, '#f91f79');
  grad.addColorStop(0.5, '#b92b97');
  grad.addColorStop(1, '#773cb5');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  ctx.fillStyle = 'rgba(252, 204, 99, 0.15)';
  ctx.beginPath();
  ctx.arc(200, 300, 450, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(64, 93, 230, 0.18)';
  ctx.beginPath();
  ctx.arc(880, 1600, 550, 0, Math.PI * 2);
  ctx.fill();
}

export function drawStoryGlassCard(ctx, cardY = 120, cardH = 1680) {
  const cardX = 80;
  const cardW = 920;
  const cardR = 40;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  drawRoundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.fill();
  ctx.stroke();
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
