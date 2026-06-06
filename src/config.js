export const LINKS = {
  extensionGuide: 'https://github.com/mutfak-yazilimevi/raffle-app/tree/main/chrome-extension',
  extensionDownloadFallback:
    'https://raw.githubusercontent.com/mutfak-yazilimevi/raffle-app/main/public/instagram-raffle-helper.zip',
  instagram: 'https://www.instagram.com/',
  github: 'https://github.com/mutfak-yazilimevi/raffle-app',
  app: 'https://mutfak-yazilimevi.github.io/raffle-app/',
};

function getPageDirectory() {
  const path = window.location.pathname;
  if (path.endsWith('/')) return path;

  const lastSlash = path.lastIndexOf('/');
  const lastSegment = path.slice(lastSlash + 1);
  if (lastSegment.includes('.')) {
    return path.slice(0, lastSlash + 1);
  }
  return `${path}/`;
}

/** Mevcut sayfa konumuna göre eklenti ZIP yolunu üretir. */
export function getExtensionDownloadUrl() {
  const base = import.meta.env.BASE_URL || './';
  return new URL(
    `${base}instagram-raffle-helper.zip`,
    `${window.location.origin}${getPageDirectory()}`
  ).href;
}
