function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/@[a-zA-Z0-9._]+/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordJaccard(a, b) {
  const wa = new Set(a.split(' ').filter(Boolean));
  const wb = new Set(b.split(' ').filter(Boolean));
  if (wa.size === 0 && wb.size === 0) return 1;
  if (wa.size === 0 || wb.size === 0) return 0;
  let common = 0;
  wa.forEach((w) => { if (wb.has(w)) common += 1; });
  return common / (wa.size + wb.size - common);
}

function buildDuplicateTextsMap(allUserData) {
  const map = new Map();
  allUserData.forEach((userData) => {
    const seenForUser = new Set();
    userData.comments.forEach((text) => {
      const normalized = normalizeText(text);
      if (normalized.length > 0 && !seenForUser.has(normalized)) {
        seenForUser.add(normalized);
        map.set(normalized, (map.get(normalized) || 0) + 1);
      }
    });
  });
  return map;
}

function scoreSuspiciousness(userData, duplicateTexts) {
  const { comments } = userData;
  const signals = [];
  let score = 0;

  // Signal 1: Duplicate comment (weight 0.40) — same text used by ≥3 distinct users
  const hasDuplicate = comments.some((text) => {
    const normalized = normalizeText(text);
    return normalized.length > 0 && (duplicateTexts.get(normalized) || 0) >= 3;
  });
  if (hasDuplicate) {
    score += 0.40;
    signals.push('Kopya yorum');
  }

  // Signal 2: Self-repetition (weight 0.25) — own comments ≥80% similar on average
  if (comments.length >= 2) {
    const normed = comments.map(normalizeText).filter((t) => t.length > 0);
    if (normed.length >= 2) {
      let totalSim = 0;
      let pairs = 0;
      for (let i = 0; i < normed.length; i += 1) {
        for (let j = i + 1; j < normed.length; j += 1) {
          totalSim += wordJaccard(normed[i], normed[j]);
          pairs += 1;
        }
      }
      const avgSim = pairs > 0 ? totalSim / pairs : 0;
      if (avgSim >= 0.8) {
        score += 0.25;
        signals.push('Kendi kendini tekrar');
      }
    }
  }

  // Signal 3: Mention-only comments (weight 0.15) — all comments contain only @mentions
  if (comments.length > 0) {
    const allMentionOnly = comments.every((text) => {
      const stripped = text.replace(/@[a-zA-Z0-9._]+/g, '').trim();
      return stripped.length === 0;
    });
    if (allMentionOnly) {
      score += 0.15;
      signals.push('Sadece etiket');
    }
  }

  return { score, signals };
}

// Returns Map<username_lowercase, { score, signals: string[] }>
export function flagSuspiciousParticipants(comments, threshold = 0.45) {
  if (!comments.length) return new Map();

  const byUser = {};
  comments.forEach((comment) => {
    const key = comment.username.toLowerCase();
    if (!byUser[key]) byUser[key] = { username: comment.username, comments: [] };
    byUser[key].comments.push(comment.text);
  });

  const allUserData = Object.values(byUser);
  const duplicateTexts = buildDuplicateTextsMap(allUserData);

  const result = new Map();
  allUserData.forEach((userData) => {
    const { score, signals } = scoreSuspiciousness(userData, duplicateTexts);
    if (score >= threshold) {
      result.set(userData.username.toLowerCase(), { score, signals });
    }
  });
  return result;
}

export const BOT_THRESHOLDS = {
  low: 0.70,
  medium: 0.45,
  high: 0.25,
};
