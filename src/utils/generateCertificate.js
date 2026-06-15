import { getRulesSummaryLines } from './raffleConfigFile';

const APP_NAME = 'MutfakRaffleStudio';
const APP_URL = 'mutfak-yazilimevi.github.io/raffle-app';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateCertificateHtml({
  brand = {},
  prizes = [],
  rules = {},
  winners = [],
  substitutes = [],
  completedAt,
  participantCount,
  commentCount,
  logoBase64,
}) {
  const ruleLines = getRulesSummaryLines(rules);
  const raffleName = brand.raffleName || brand.name || 'Çekiliş';
  const brandName = brand.name || '—';
  const postUrl = brand.postUrl || '';

  const winnersByPrize = prizes.length > 0
    ? prizes.map((prize) => ({
        prize,
        winners: winners.filter((w) => w.prizeId === prize.id),
        substitutes: substitutes.filter((s) => s.prizeId === prize.id),
      }))
    : [{ prize: null, winners, substitutes }];

  const winnersHtml = winnersByPrize.map(({ prize, winners: pw, substitutes: ps }) => {
    const prizeLabel = prize ? esc(prize.name) : 'Kazananlar';
    const mainList = pw.map((w) => `<li>✓ @${esc(w.username)}</li>`).join('');
    const subList = ps.length > 0
      ? `<p style="margin:8px 0 4px;color:#888;font-size:13px;">Yedekler:</p><ul style="margin:0;padding-left:18px;">${ps.map((s) => `<li>@${esc(s.username)}</li>`).join('')}</ul>`
      : '';
    return `
      <div style="margin-bottom:20px;padding:16px;background:#f9f9f9;border-radius:8px;border-left:4px solid #e1306c;">
        <strong style="font-size:15px;color:#e1306c;">${prizeLabel}</strong>
        <ul style="margin:8px 0 0;padding-left:18px;">${mainList}</ul>
        ${subList}
      </div>`;
  }).join('');

  const logoHtml = logoBase64
    ? `<img src="${logoBase64}" alt="Logo" style="max-height:64px;max-width:200px;object-fit:contain;margin-bottom:12px;" />`
    : '';

  const statsHtml = (commentCount != null || participantCount != null) ? `
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      ${commentCount != null ? `<tr><td style="padding:6px 8px;color:#555;">Toplam yorum sayısı</td><td style="padding:6px 8px;font-weight:600;">${esc(String(commentCount))}</td></tr>` : ''}
      ${participantCount != null ? `<tr><td style="padding:6px 8px;color:#555;">Geçerli katılımcı sayısı</td><td style="padding:6px 8px;font-weight:600;">${esc(String(participantCount))}</td></tr>` : ''}
    </table>` : '';

  const rulesHtml = ruleLines.length > 0
    ? `<ul style="margin:0 0 16px;padding-left:18px;color:#444;">${ruleLines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`
    : '<p style="color:#888;">Standart kurallar</p>';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(APP_NAME)} — Şeffaflık Sertifikası: ${esc(raffleName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; color: #222; }
    .page { max-width: 760px; margin: 32px auto; background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,.10); overflow: hidden; }
    .header { background: linear-gradient(135deg, #405de6 0%, #c13584 50%, #e1306c 100%); color: #fff; padding: 32px 40px; }
    .header h1 { margin: 0 0 4px; font-size: 22px; font-weight: 800; letter-spacing: -.3px; }
    .header p { margin: 0; opacity: .85; font-size: 14px; }
    .section { padding: 28px 40px; border-bottom: 1px solid #eee; }
    .section h2 { margin: 0 0 16px; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #405de6; }
    .meta-grid { display: grid; grid-template-columns: 140px 1fr; gap: 6px 12px; }
    .meta-grid dt { color: #888; font-size: 13px; }
    .meta-grid dd { margin: 0; font-weight: 600; font-size: 13px; word-break: break-all; }
    .footer { padding: 20px 40px; background: #fafafa; font-size: 12px; color: #888; text-align: center; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 50px; font-size: 11px; font-weight: 700; background: linear-gradient(135deg,#405de6,#e1306c); color: #fff; margin-bottom: 8px; }
    @media print {
      body { background: #fff; }
      .page { box-shadow: none; margin: 0; border-radius: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      ${logoHtml}
      <div class="badge">${esc(APP_NAME)}</div>
      <h1>Şeffaflık Sertifikası</h1>
      <p>Bu belge çekilişin adil yapıldığını kanıtlar.</p>
    </div>

    <div class="section">
      <h2>Çekiliş Bilgileri</h2>
      <dl class="meta-grid">
        <dt>Çekiliş Adı</dt><dd>${esc(raffleName)}</dd>
        <dt>Marka / Organizatör</dt><dd>${esc(brandName)}</dd>
        ${postUrl ? `<dt>Gönderi</dt><dd><a href="${esc(postUrl)}" target="_blank" rel="noopener">${esc(postUrl)}</a></dd>` : ''}
        <dt>Tarih</dt><dd>${formatDate(completedAt)}</dd>
      </dl>
    </div>

    ${(commentCount != null || participantCount != null) ? `<div class="section"><h2>Katılım İstatistikleri</h2>${statsHtml}</div>` : ''}

    <div class="section">
      <h2>Uygulanan Kurallar</h2>
      ${rulesHtml}
    </div>

    <div class="section">
      <h2>Çekiliş Yöntemi</h2>
      <p style="margin:0;color:#444;font-size:14px;">Rastgele seçim — organizatörün tarayıcısında gerçekleştirilmiştir (sunucu dışı).</p>
    </div>

    <div class="section">
      <h2>Kazananlar</h2>
      ${winnersHtml}
    </div>

    <div class="footer">
      <p style="margin:0 0 4px;">Bu belge <strong>${esc(APP_NAME)}</strong> tarafından oluşturulmuştur.</p>
      <p style="margin:0 0 4px;">Tüm veriler organizatörün tarayıcısında yerel olarak işlenmiştir. Hiçbir katılımcı verisi üçüncü taraf sunuculara iletilmemiştir.</p>
      <p style="margin:0;"><a href="https://${APP_URL}" target="_blank" rel="noopener" style="color:#405de6;">${APP_URL}</a></p>
    </div>
  </div>
</body>
</html>`;
}

export function downloadCertificate(options) {
  const html = generateCertificateHtml(options);
  const slug = (options.brand?.raffleName || 'cekilis')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_|_$/g, '');
  const date = options.completedAt
    ? new Date(options.completedAt).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const filename = `sertifika_${slug}_${date}.html`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
