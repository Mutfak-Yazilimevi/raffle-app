function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractOgMeta(html, property) {
  const esc = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re1 = new RegExp(`<meta[^>]+property=["']${esc}["'][^>]+content=["']([^"']*?)["']`, 'i');
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*?)["'][^>]+property=["']${esc}["']`, 'i');
  const m = html.match(re1) || html.match(re2);
  return m ? decodeHtmlEntities(m[1]) : null;
}

function extractJsonLdCaption(html) {
  try {
    const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item.caption) return String(item.caption);
        if (item.description) return String(item.description);
        if (item.articleBody) return String(item.articleBody);
      }
    }
  } catch (_) { /* JSON-LD parse failed */ }
  return '';
}

function cleanOgDescription(desc) {
  if (!desc) return '';
  const s = desc
    .replace(/^[\d,.]+ (?:likes?|beğeni)[,\s]+[\d,.]+ (?:comments?|yorum)\s*[-–]\s*/i, '')
    .replace(/^[^:]+\s+on\s+Instagram:\s*"?([\s\S]+?)"?\s*$/i, '$1')
    .replace(/^[^:]+:\s*"([\s\S]+)"\s*$/s, '$1')
    .trim();
  return s || desc.trim();
}

export async function fetchPostMetadata(postUrl) {
  let path;
  try {
    const u = new URL(postUrl);
    if (!u.hostname.includes('instagram.com')) {
      return { ok: false, error: 'Instagram URL değil' };
    }
    path = u.pathname.replace(/\/?$/, '/');
  } catch (_) {
    return { ok: false, error: 'Geçersiz URL' };
  }

  let html;
  try {
    const resp = await fetch(`/proxy/instagram${path}`, {
      headers: { Accept: 'text/html' },
    });
    if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` };
    html = await resp.text();
  } catch (err) {
    return { ok: false, error: err.message || 'Ağ hatası' };
  }

  const title = extractOgMeta(html, 'og:title');
  const ogDesc = extractOgMeta(html, 'og:description');

  if (!title && !ogDesc) {
    return { ok: false, error: 'Post bilgileri bulunamadı (oturum açık olmalı)' };
  }

  const description = extractJsonLdCaption(html) || cleanOgDescription(ogDesc) || ogDesc || '';

  let brandName = null;
  if (title) {
    const m1 = title.match(/^(.+?)\s+\(@[^)]+\)/);
    if (m1) brandName = m1[1].trim();
    else {
      const m2 = title.match(/^@?(\S+)\s+[•·]/);
      if (m2) brandName = m2[1].trim();
    }
  }

  return { ok: true, postUrl, brandName, title, description };
}
