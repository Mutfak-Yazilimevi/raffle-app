export const EXTENSION_ZIP_NAME = 'instagram-raffle-helper.zip';

export const LINKS = {
  extensionGuide: 'https://github.com/mutfak-yazilimevi/raffle-app/tree/main/chrome-extension',
  extensionDownloadFallback:
    'https://cdn.jsdelivr.net/gh/mutfak-yazilimevi/raffle-app@main/public/instagram-raffle-helper.zip',
  extensionDownloadFallbackRaw:
    'https://github.com/mutfak-yazilimevi/raffle-app/raw/main/public/instagram-raffle-helper.zip',
  instagram: 'https://www.instagram.com/',
  github: 'https://github.com/mutfak-yazilimevi/raffle-app',
  app: 'https://mutfak-yazilimevi.github.io/raffle-app/',
};

/** Gönderi linki yoksa instagram.com, varsa geçerli URL döner. */
export function resolveInstagramUrl(postUrl) {
  const trimmed = (postUrl || '').trim();
  if (!trimmed) return LINKS.instagram;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Eklenti ZIP indirme adresleri (sırayla denenir). */
export function getExtensionDownloadUrls() {
  const urls = [];

  if (typeof window !== 'undefined') {
    try {
      const base = import.meta.env.BASE_URL || './';
      urls.push(new URL(`${base}${EXTENSION_ZIP_NAME}`, window.location.href).href);
    } catch (_) {
      /* ignore */
    }
  }

  urls.push(`${LINKS.app}${EXTENSION_ZIP_NAME}`);
  urls.push(LINKS.extensionDownloadFallback);
  urls.push(LINKS.extensionDownloadFallbackRaw);

  return [...new Set(urls)];
}

/** @deprecated getExtensionDownloadUrls kullanın */
export function getExtensionDownloadUrl() {
  return getExtensionDownloadUrls()[0];
}
