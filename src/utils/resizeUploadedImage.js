/** Yüklenen logo / ödül görsellerini oran koruyarak sıkıştırır */

export const IMAGE_PRESETS = {
  logo: {
    maxDimension: 320,
    quality: 0.78,
    mime: 'image/jpeg',
    maxBytes: 120_000,
  },
  prize: {
    maxDimension: 480,
    quality: 0.78,
    mime: 'image/jpeg',
    maxBytes: 180_000,
  },
};

function scaleDimensions(width, height, maxDimension) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  if (width >= height) {
    return {
      width: maxDimension,
      height: Math.max(1, Math.round((height / width) * maxDimension)),
    };
  }
  return {
    width: Math.max(1, Math.round((width / height) * maxDimension)),
    height: maxDimension,
  };
}

function estimateDataUrlBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
}

/**
 * @param {string} source - data URL veya blob URL
 * @param {'logo' | 'prize'} preset
 * @returns {Promise<string>} JPEG data URL
 */
export function resizeUploadedImage(source, preset = 'prize') {
  const config = IMAGE_PRESETS[preset] || IMAGE_PRESETS.prize;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = scaleDimensions(img.width, img.height, config.maxDimension);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas desteklenmiyor'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      let quality = config.quality;
      let dataUrl = canvas.toDataURL(config.mime, quality);

      while (estimateDataUrlBytes(dataUrl) > config.maxBytes && quality > 0.45) {
        quality = Math.round((quality - 0.06) * 100) / 100;
        dataUrl = canvas.toDataURL(config.mime, quality);
      }

      resolve(dataUrl);
    };
    img.onerror = () => reject(new Error('Görsel okunamadı'));
    img.src = source;
  });
}

export function resizeImageFromFile(file, preset = 'prize') {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      reject(new Error('Geçersiz görsel dosyası'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      resizeUploadedImage(event.target.result, preset).then(resolve).catch(reject);
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.readAsDataURL(file);
  });
}

export function shouldRecompressImage(dataUrl, preset = 'prize') {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return false;
  const config = IMAGE_PRESETS[preset] || IMAGE_PRESETS.prize;
  if (estimateDataUrlBytes(dataUrl) > config.maxBytes) return true;
  return !dataUrl.startsWith('data:image/jpeg');
}

export async function recompressIfNeeded(dataUrl, preset = 'prize') {
  if (!shouldRecompressImage(dataUrl, preset)) return dataUrl;
  try {
    return await resizeUploadedImage(dataUrl, preset);
  } catch {
    return dataUrl;
  }
}
