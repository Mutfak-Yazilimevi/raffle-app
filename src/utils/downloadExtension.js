import { getExtensionDownloadUrls } from '../config';

const DOWNLOAD_FILENAME = 'instagram-raffle-helper.zip';

function triggerBlobDownload(blob) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = DOWNLOAD_FILENAME;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

async function fetchAsBlob(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.blob();
}

/**
 * Önce sitedeki ZIP'i dener, bulunamazsa GitHub yedek adresine düşer.
 */
export async function downloadChromeExtension() {
  const sources = getExtensionDownloadUrls().map((url, index) => ({
    url,
    label: index === 0 ? 'site' : `fallback-${index}`,
  }));

  let lastError = null;

  for (const source of sources) {
    try {
      const blob = await fetchAsBlob(source.url);
      if (blob.size === 0) {
        throw new Error('empty file');
      }
      triggerBlobDownload(blob);
      return { ok: true, source: source.label };
    } catch (error) {
      lastError = error;
    }
  }

  console.error('Extension download failed:', lastError);
  return { ok: false, error: lastError };
}
