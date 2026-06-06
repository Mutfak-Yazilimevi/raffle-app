const SETUP_KEY = 'raffle_setup_state';
const RESULTS_KEY = 'raffle_last_draw_results';
const IMAGES_DB = 'raffle_setup_images';
const IMAGES_STORE = 'images';

export function isRaffleConfigured(state) {
  if (!state) return false;
  const brand = state.brand || {};
  const prizes = state.prizes || [];
  return Boolean(
    brand.raffleName?.trim() ||
    brand.name?.trim() ||
    prizes.some((p) => p.name?.trim())
  );
}

export function deriveRafflePhase(setupState, drawResults) {
  if (drawResults?.winners?.length > 0) return 'completed';
  if (isRaffleConfigured(setupState)) return 'configured';
  return 'empty';
}

export function loadDrawResults() {
  const raw = localStorage.getItem(RESULTS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.winners)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDrawResults(results) {
  return trySetLocalStorage(
    RESULTS_KEY,
    JSON.stringify({
      winners: results.winners || [],
      substitutes: results.substitutes || [],
      completedAt: new Date().toISOString(),
    })
  );
}

export function clearDrawResults() {
  localStorage.removeItem(RESULTS_KEY);
}

function openImagesDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGES_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(IMAGES_STORE)) {
        request.result.createObjectStore(IMAGES_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(key) {
  const db = await openImagesDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGES_STORE, 'readonly');
    const req = tx.objectStore(IMAGES_STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? '');
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openImagesDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGES_STORE, 'readwrite');
    tx.objectStore(IMAGES_STORE).put(value || '', key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(key) {
  const db = await openImagesDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGES_STORE, 'readwrite');
    tx.objectStore(IMAGES_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function toLightweightState(state) {
  return {
    rawText: state.rawText,
    comments: state.comments,
    brand: {
      name: state.brand?.name || '',
      raffleName: state.brand?.raffleName || '',
      postUrl: state.brand?.postUrl || '',
    },
    prizes: (state.prizes || []).map(({ id, name, winnerCount, substituteCount }) => ({
      id,
      name,
      winnerCount,
      substituteCount,
    })),
    entryMethod: state.entryMethod,
    minMentions: state.minMentions,
    mentionMode: state.mentionMode,
    weightedEntry: state.weightedEntry,
    uniqueMentions: state.uniqueMentions,
    keywordRequired: state.keywordRequired,
    keywordBlacklist: state.keywordBlacklist,
    userBlacklist: state.userBlacklist,
    requiredFollowAccounts: state.requiredFollowAccounts,
    minRequiredFollows: state.minRequiredFollows,
    followVerification: state.followVerification,
    showPrizeProductsInResultsStory: state.showPrizeProductsInResultsStory,
    storyBackgroundId: state.storyBackgroundId,
  };
}

function trySetLocalStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn('localStorage save failed:', error);
    return false;
  }
}

export async function loadSetupState() {
  const savedData = localStorage.getItem(SETUP_KEY);
  if (!savedData) return null;

  try {
    const parsed = JSON.parse(savedData);
    const hadInlineImages =
      Boolean(parsed.brand?.logo) ||
      (parsed.prizes || []).some((prize) => prize.image);

    if (hadInlineImages) {
      if (parsed.brand?.logo) {
        await idbSet('brand:logo', parsed.brand.logo);
      }
      for (const prize of parsed.prizes || []) {
        if (prize.image) {
          await idbSet(`prize:${prize.id}`, prize.image);
        }
      }
      trySetLocalStorage(SETUP_KEY, JSON.stringify(toLightweightState({
        ...parsed,
        brand: { name: parsed.brand?.name || '', raffleName: parsed.brand?.raffleName || '', postUrl: parsed.brand?.postUrl || '', logo: '' },
        prizes: (parsed.prizes || []).map(({ id, name, winnerCount, substituteCount }) => ({
          id, name, winnerCount, substituteCount,
        })),
      })));
    }

    const brandLogo = parsed.brand?.logo || await idbGet('brand:logo').catch(() => '');

    const prizes = await Promise.all(
      (parsed.prizes || []).map(async (prize) => ({
        ...prize,
        image: prize.image || await idbGet(`prize:${prize.id}`).catch(() => ''),
      }))
    );

    return {
      ...parsed,
      brand: {
        name: parsed.brand?.name || '',
        raffleName: parsed.brand?.raffleName || '',
        postUrl: parsed.brand?.postUrl || '',
        logo: brandLogo,
      },
      prizes: prizes.length > 0
        ? prizes
        : [{ id: Date.now(), name: '', image: '', winnerCount: 1, substituteCount: 1 }],
    };
  } catch (error) {
    console.error('Setup state load failed:', error);
    return null;
  }
}

export async function saveSetupState(state) {
  const lightweight = toLightweightState(state);
  const json = JSON.stringify(lightweight);

  let saved = trySetLocalStorage(SETUP_KEY, json);

  if (!saved) {
    const withoutComments = {
      ...lightweight,
      rawText: '',
      comments: [],
    };
    saved = trySetLocalStorage(SETUP_KEY, JSON.stringify(withoutComments));
  }

  try {
    if (state.brand?.logo) {
      await idbSet('brand:logo', state.brand.logo);
    } else {
      await idbDelete('brand:logo');
    }

    const prizeIds = new Set((state.prizes || []).map((p) => p.id));
    for (const prize of state.prizes || []) {
      if (prize.image) {
        await idbSet(`prize:${prize.id}`, prize.image);
      } else {
        await idbDelete(`prize:${prize.id}`);
      }
    }

    // Kaldırılan ödüllerin resimlerini temizle
    const db = await openImagesDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IMAGES_STORE, 'readwrite');
      const store = tx.objectStore(IMAGES_STORE);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        for (const key of req.result) {
          if (typeof key === 'string' && key.startsWith('prize:')) {
            const id = Number(key.slice(6));
            if (!prizeIds.has(id)) {
              store.delete(key);
            }
          }
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn('Image storage save failed:', error);
  }

  return saved;
}

export function clearSetupState() {
  localStorage.removeItem(SETUP_KEY);
  openImagesDb()
    .then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(IMAGES_STORE, 'readwrite');
      tx.objectStore(IMAGES_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }))
    .catch(() => {});
}
