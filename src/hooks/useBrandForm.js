import { useState } from 'react';
import { normalizeBrand, EMPTY_BRAND_SCHEDULE, pickBrandForStorage } from '../utils/raffleSchedule';
import { DEFAULT_STORY_BACKGROUND_ID } from '../utils/storyBackgrounds';
import { resizeImageFromFile, resizeUploadedImage, recompressIfNeeded } from '../utils/resizeUploadedImage';

const EMPTY_BRAND = {
  name: '', logo: '', raffleName: '', postUrl: '', postDescription: '',
  ...EMPTY_BRAND_SCHEDULE,
};

const emptyPrize = () => ({ id: Date.now(), name: '', image: '', winnerCount: 1, substituteCount: 1 });

export function useBrandForm() {
  const [brand, setBrand] = useState({ ...EMPTY_BRAND });
  const [prizes, setPrizes] = useState([emptyPrize()]);
  const [showPrizeProductsInResultsStory, setShowPrizeProductsInResultsStory] = useState(false);
  const [storyBackgroundId, setStoryBackgroundId] = useState(DEFAULT_STORY_BACKGROUND_ID);

  const addPrize = () =>
    setPrizes((prev) => [...prev, emptyPrize()]);

  const removePrize = (id) =>
    setPrizes((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));

  const updatePrize = (id, field, value) =>
    setPrizes((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const handleImageUpload = (e, callback, preset = 'prize') => {
    const file = e.target.files[0];
    if (!file) return;
    resizeImageFromFile(file, preset)
      .then(callback)
      .catch(() => alert('Görsel yüklenemedi. JPG veya PNG deneyin.'));
    e.target.value = '';
  };

  async function applyBrand(saved) {
    if (saved.brand) setBrand(normalizeBrand(saved.brand));
    if (saved.prizes) setPrizes(saved.prizes);
    if (saved.showPrizeProductsInResultsStory != null) {
      setShowPrizeProductsInResultsStory(Boolean(saved.showPrizeProductsInResultsStory));
    }
    setStoryBackgroundId(saved.storyBackgroundId || DEFAULT_STORY_BACKGROUND_ID);
  }

  async function applyImportedBrand(config) {
    let logo = config.brand?.logo || '';
    if (logo) {
      try { logo = await resizeUploadedImage(logo, 'logo'); } catch { /* orijinal korunur */ }
    }

    const importedPrizes = await Promise.all(
      (config.prizes || []).map(async (prize) => {
        let image = prize.image || '';
        if (image) {
          try { image = await resizeUploadedImage(image, 'prize'); } catch { /* orijinal korunur */ }
        }
        return { ...prize, image };
      })
    );

    setBrand(normalizeBrand({ ...config.brand, logo }));
    setPrizes(importedPrizes);
    setShowPrizeProductsInResultsStory(Boolean(config.showPrizeProductsInResultsStory));
    setStoryBackgroundId(config.storyBackgroundId || DEFAULT_STORY_BACKGROUND_ID);
  }

  async function recompressBrandImages(saved) {
    try {
      if (saved.brand?.logo) {
        const logo = await recompressIfNeeded(saved.brand.logo, 'logo');
        if (logo !== saved.brand.logo) setBrand((prev) => ({ ...prev, logo }));
      }
      if (saved.prizes?.length) {
        const compressed = await Promise.all(
          saved.prizes.map(async (prize) => {
            if (!prize.image) return prize;
            const image = await recompressIfNeeded(prize.image, 'prize');
            return image === prize.image ? prize : { ...prize, image };
          })
        );
        if (compressed.some((p, i) => p.image !== saved.prizes[i]?.image)) {
          setPrizes(compressed);
        }
      }
    } catch (err) {
      console.warn('Görsel sıkıştırma atlandı:', err);
    }
  }

  function resetBrand() {
    setBrand({ ...EMPTY_BRAND });
    setPrizes([emptyPrize()]);
    setShowPrizeProductsInResultsStory(false);
    setStoryBackgroundId(DEFAULT_STORY_BACKGROUND_ID);
  }

  function getBrandSnapshot() {
    return {
      brand: pickBrandForStorage(brand),
      prizes,
      showPrizeProductsInResultsStory,
      storyBackgroundId,
    };
  }

  return {
    brand, setBrand,
    prizes, setPrizes,
    addPrize, removePrize, updatePrize,
    showPrizeProductsInResultsStory, setShowPrizeProductsInResultsStory,
    storyBackgroundId, setStoryBackgroundId,
    handleImageUpload,
    applyBrand, applyImportedBrand, recompressBrandImages, resetBrand, getBrandSnapshot,
  };
}
