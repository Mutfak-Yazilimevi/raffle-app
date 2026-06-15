export const FOLLOW_VERIFY_REQUEST_KEY = 'raffle_follow_verify_request';
export const FOLLOW_VERIFY_RESULTS_KEY = 'raffle_follow_verify_results';
export const LIKE_FOLLOW_VERIFY_REQUEST_KEY = 'raffle_like_follow_verify_request';
export const LIKE_FOLLOW_VERIFY_RESULTS_KEY = 'raffle_like_follow_verify_results';

export function parseFollowAccountList(input) {
  if (!input || typeof input !== 'string') return [];
  return Array.from(new Set(
    input
      .split(/[,;\n]+/)
      .map((part) => part.trim().replace(/^@+/, '').toLowerCase())
      .filter((name) => /^[a-z0-9._]+$/.test(name))
  ));
}

export function isFollowRuleActive(requiredFollowAccounts, requireFollowAccounts = false) {
  if (!requireFollowAccounts) return false;
  return parseFollowAccountList(requiredFollowAccounts).length > 0;
}

export function getEffectiveMinRequiredFollows(accounts) {
  return accounts.length;
}

export function evaluateFollowRequirement(followedAccounts, requiredAccounts, minRequiredFollows) {
  const required = requiredAccounts.map((a) => a.toLowerCase());
  const followed = (followedAccounts || []).map((a) => a.toLowerCase());
  const min = minRequiredFollows ?? getEffectiveMinRequiredFollows(required);
  const matched = required.filter((acc) => followed.includes(acc));
  const missing = required.filter((acc) => !followed.includes(acc));
  return {
    followed: matched,
    missing,
    meetsRequirement: matched.length >= min,
    minRequired: min,
  };
}

export function getFollowRuleSummary(requiredFollowAccounts, requireFollowAccounts = false) {
  if (!requireFollowAccounts) return null;
  const accounts = parseFollowAccountList(requiredFollowAccounts);
  if (accounts.length === 0) return null;
  const handles = accounts.map((a) => `@${a}`).join(', ');
  if (accounts.length === 1) {
    return `Takip şartı: ${handles} hesabını takip etmek zorunlu`;
  }
  return `Takip şartı: ${handles} hesaplarını takip etmek zorunlu`;
}

export function buildFollowVerifyRequest(participants, requiredFollowAccounts, requireFollowAccounts = false) {
  const accounts = parseFollowAccountList(requiredFollowAccounts);
  return {
    requestId: Date.now(),
    status: 'pending',
    participants: Array.from(new Set(participants.map((p) => p.replace(/^@+/, '').toLowerCase()))),
    requiredFollowAccounts: accounts,
    minRequiredFollows: getEffectiveMinRequiredFollows(accounts),
    requireFollowAccounts: Boolean(requireFollowAccounts),
    createdAt: new Date().toISOString(),
  };
}

export function normalizeFollowVerificationResults(payload) {
  if (!payload || typeof payload !== 'object') return {};
  const map = {};
  const entries = payload.results || payload;
  Object.entries(entries).forEach(([username, data]) => {
    if (!data || typeof data !== 'object') return;
    const key = username.toLowerCase().replace(/^@+/, '');
    // `verified` yalnızca eklenti açıkça ok:false ya da error set ettiyse false olur.
    // ok alanı olmasa bile followed/missing alanlarından biri varsa doğrulama tamamlanmış sayılır.
    const hasVerificationData = Array.isArray(data.followed) || Array.isArray(data.missing);
    const verified = data.ok !== false && !data.error && hasVerificationData;
    map[key] = {
      followed: (data.followed || []).map((a) => a.toLowerCase()),
      missing: (data.missing || []).map((a) => a.toLowerCase()),
      meetsRequirement: Boolean(data.meetsRequirement),
      verified,
      error: data.error || null,
      checkedVia: data.checkedVia || null,
      verifiedAt: payload.completedAt || data.verifiedAt || new Date().toISOString(),
    };
  });
  return map;
}
