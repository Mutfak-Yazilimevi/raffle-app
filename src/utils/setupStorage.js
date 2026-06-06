import { parseParticipationCriteria } from './participationCriteria';

const REGISTRY_KEY = 'raffle_registry_v1';
const LEGACY_SETUP_KEY = 'raffle_setup_state';
const LEGACY_RESULTS_KEY = 'raffle_last_draw_results';
const IMAGES_DB = 'raffle_setup_images';
const IMAGES_STORE = 'images';

let registryInitPromise = null;

export function createRaffleId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

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

function setupStorageKey(raffleId) {
  return `raffle_setup_${raffleId}`;
}

function imageLogoKey(raffleId) {
  return `raffle:${raffleId}:brand:logo`;
}

function imagePrizeKey(raffleId, prizeId) {
  return `raffle:${raffleId}:prize:${prizeId}`;
}

function readRegistry() {
  const raw = localStorage.getItem(REGISTRY_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || !Array.isArray(parsed.raffles)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeRegistry(registry) {
  return trySetLocalStorage(REGISTRY_KEY, JSON.stringify(registry));
}

function buildSummaryFromState(state) {
  const brand = state?.brand || {};
  const prizes = state?.prizes || [];
  return {
    raffleName: brand.raffleName?.trim() || '',
    brandName: brand.name?.trim() || '',
    prizeCount: prizes.filter((p) => p.name?.trim()).length,
  };
}

function upsertRegistryEntry(registry, raffleId, patch) {
  const index = registry.raffles.findIndex((r) => r.id === raffleId);
  const now = new Date().toISOString();
  if (index === -1) {
    registry.raffles.unshift({
      id: raffleId,
      createdAt: now,
      updatedAt: now,
      summary: { raffleName: '', brandName: '', prizeCount: 0 },
      drawResults: null,
      ...patch,
    });
    return;
  }
  registry.raffles[index] = {
    ...registry.raffles[index],
    ...patch,
    updatedAt: now,
  };
}

function loadLegacyDrawResults() {
  const raw = localStorage.getItem(LEGACY_RESULTS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.winners)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function migrateLegacyImagesToRaffle(raffleId, parsed) {
  if (parsed.brand?.logo) {
    await idbSet(imageLogoKey(raffleId), parsed.brand.logo);
  } else {
    const legacyLogo = await idbGet('brand:logo').catch(() => '');
    if (legacyLogo) await idbSet(imageLogoKey(raffleId), legacyLogo);
  }

  for (const prize of parsed.prizes || []) {
    if (prize.image) {
      await idbSet(imagePrizeKey(raffleId, prize.id), prize.image);
    } else {
      const legacyImage = await idbGet(`prize:${prize.id}`).catch(() => '');
      if (legacyImage) await idbSet(imagePrizeKey(raffleId, prize.id), legacyImage);
    }
  }
}

async function migrateLegacyStorage() {
  const legacySetupRaw = localStorage.getItem(LEGACY_SETUP_KEY);
  const legacyResults = loadLegacyDrawResults();
  const id = createRaffleId();
  const now = new Date().toISOString();

  let summary = { raffleName: '', brandName: '', prizeCount: 0 };
  if (legacySetupRaw) {
    try {
      const parsed = JSON.parse(legacySetupRaw);
      await migrateLegacyImagesToRaffle(id, parsed);
      const lightweight = toLightweightState(parsed);
      trySetLocalStorage(setupStorageKey(id), JSON.stringify(lightweight));
      summary = buildSummaryFromState(parsed);
    } catch (error) {
      console.warn('Legacy setup migration failed:', error);
    }
  }

  const registry = {
    version: 1,
    activeId: id,
    raffles: [{
      id,
      createdAt: now,
      updatedAt: now,
      summary,
      drawResults: legacyResults,
    }],
  };

  writeRegistry(registry);
  localStorage.removeItem(LEGACY_SETUP_KEY);
  localStorage.removeItem(LEGACY_RESULTS_KEY);
  return registry;
}

export async function ensureRegistryInitialized() {
  if (registryInitPromise) return registryInitPromise;
  registryInitPromise = (async () => {
    const existing = readRegistry();
    if (existing) return existing;
    return migrateLegacyStorage();
  })();
  return registryInitPromise;
}

export function getActiveRaffleId() {
  return readRegistry()?.activeId || null;
}

export function setActiveRaffleId(raffleId) {
  const registry = readRegistry();
  if (!registry || !raffleId) return false;
  registry.activeId = raffleId;
  return writeRegistry(registry);
}

export async function createRaffle() {
  const registry = await ensureRegistryInitialized();
  const id = createRaffleId();
  const now = new Date().toISOString();
  registry.raffles.unshift({
    id,
    createdAt: now,
    updatedAt: now,
    summary: { raffleName: '', brandName: '', prizeCount: 0 },
    drawResults: null,
  });
  registry.activeId = id;
  writeRegistry(registry);
  return id;
}

export async function listRaffleEntries() {
  const registry = await ensureRegistryInitialized();
  return [...registry.raffles]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map((entry) => ({
      id: entry.id,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      summary: entry.summary || {},
      drawResults: entry.drawResults,
    }));
}

export async function loadRaffleDisplayBundle(raffleId) {
  await ensureRegistryInitialized();
  const setup = await loadSetupState(raffleId);
  const entry = readRegistry()?.raffles.find((r) => r.id === raffleId);
  const drawResults = entry?.drawResults || null;
  return {
    setup,
    drawResults,
    phase: deriveRafflePhase(setup, drawResults),
  };
}

export function loadDrawResults(raffleId) {
  const id = raffleId || getActiveRaffleId();
  if (!id) return null;
  const entry = readRegistry()?.raffles.find((r) => r.id === id);
  if (!entry?.drawResults || !Array.isArray(entry.drawResults.winners)) return null;
  return entry.drawResults;
}

export function saveDrawResults(results, raffleId) {
  const id = raffleId || getActiveRaffleId();
  if (!id) return false;
  const registry = readRegistry();
  if (!registry) return false;

  const drawResults = {
    winners: results.winners || [],
    substitutes: results.substitutes || [],
    completedAt: new Date().toISOString(),
  };

  upsertRegistryEntry(registry, id, { drawResults });
  return writeRegistry(registry);
}

export function clearDrawResults(raffleId) {
  const id = raffleId || getActiveRaffleId();
  if (!id) return;
  const registry = readRegistry();
  if (!registry) return;
  upsertRegistryEntry(registry, id, { drawResults: null });
  writeRegistry(registry);
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
    followVerification: state.followVerification,
    ...parseParticipationCriteria(state),
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

function resolveRaffleId(raffleId) {
  return raffleId || getActiveRaffleId();
}

export async function loadSetupState(raffleId) {
  await ensureRegistryInitialized();
  const id = resolveRaffleId(raffleId);
  if (!id) return null;

  const savedData = localStorage.getItem(setupStorageKey(id));
  if (!savedData) return null;

  try {
    const parsed = JSON.parse(savedData);
    const hadInlineImages =
      Boolean(parsed.brand?.logo) ||
      (parsed.prizes || []).some((prize) => prize.image);

    if (hadInlineImages) {
      if (parsed.brand?.logo) {
        await idbSet(imageLogoKey(id), parsed.brand.logo);
      }
      for (const prize of parsed.prizes || []) {
        if (prize.image) {
          await idbSet(imagePrizeKey(id, prize.id), prize.image);
        }
      }
      trySetLocalStorage(setupStorageKey(id), JSON.stringify(toLightweightState({
        ...parsed,
        brand: {
          name: parsed.brand?.name || '',
          raffleName: parsed.brand?.raffleName || '',
          postUrl: parsed.brand?.postUrl || '',
          logo: '',
        },
        prizes: (parsed.prizes || []).map(({ id: prizeId, name, winnerCount, substituteCount }) => ({
          id: prizeId,
          name,
          winnerCount,
          substituteCount,
        })),
      })));
    }

    const brandLogo = parsed.brand?.logo || await idbGet(imageLogoKey(id)).catch(() => '');

    const prizes = await Promise.all(
      (parsed.prizes || []).map(async (prize) => ({
        ...prize,
        image: prize.image || await idbGet(imagePrizeKey(id, prize.id)).catch(() => ''),
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

export async function saveSetupState(state, raffleId) {
  await ensureRegistryInitialized();
  const id = resolveRaffleId(raffleId);
  if (!id) return false;

  const lightweight = toLightweightState(state);
  const json = JSON.stringify(lightweight);

  let saved = trySetLocalStorage(setupStorageKey(id), json);

  if (!saved) {
    const withoutComments = {
      ...lightweight,
      rawText: '',
      comments: [],
    };
    saved = trySetLocalStorage(setupStorageKey(id), JSON.stringify(withoutComments));
  }

  const registry = readRegistry();
  if (registry) {
    upsertRegistryEntry(registry, id, { summary: buildSummaryFromState(state) });
    writeRegistry(registry);
  }

  try {
    if (state.brand?.logo) {
      await idbSet(imageLogoKey(id), state.brand.logo);
    } else {
      await idbDelete(imageLogoKey(id));
    }

    const prizeIds = new Set((state.prizes || []).map((p) => p.id));
    const prizePrefix = `raffle:${id}:prize:`;

    for (const prize of state.prizes || []) {
      if (prize.image) {
        await idbSet(imagePrizeKey(id, prize.id), prize.image);
      } else {
        await idbDelete(imagePrizeKey(id, prize.id));
      }
    }

    const db = await openImagesDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IMAGES_STORE, 'readwrite');
      const store = tx.objectStore(IMAGES_STORE);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        for (const key of req.result) {
          if (typeof key === 'string' && key.startsWith(prizePrefix)) {
            const prizeId = Number(key.slice(prizePrefix.length));
            if (!prizeIds.has(prizeId)) {
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

export function clearSetupState(raffleId) {
  const id = resolveRaffleId(raffleId);
  if (!id) return;
  localStorage.removeItem(setupStorageKey(id));
}
