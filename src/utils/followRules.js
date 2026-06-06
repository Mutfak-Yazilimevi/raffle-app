export const FOLLOW_VERIFY_REQUEST_KEY = 'raffle_follow_verify_request';
export const FOLLOW_VERIFY_RESULTS_KEY = 'raffle_follow_verify_results';

export function parseFollowAccountList(input) {
  if (!input || typeof input !== 'string') return [];
  return Array.from(new Set(
    input
      .split(/[,;\n]+/)
      .map((part) => part.trim().replace(/^@+/, '').toLowerCase())
      .filter((name) => /^[a-z0-9._]+$/.test(name))
  ));
}

export function isFollowRuleActive(requiredFollowAccounts, minRequiredFollows) {
  const accounts = parseFollowAccountList(requiredFollowAccounts);
  return accounts.length > 0 && minRequiredFollows > 0;
}

export function getEffectiveMinRequiredFollows(accounts, minRequiredFollows) {
  if (accounts.length === 0) return 0;
  const min = Math.max(1, parseInt(minRequiredFollows, 10) || 1);
  return Math.min(min, accounts.length);
}

export function evaluateFollowRequirement(followedAccounts, requiredAccounts, minRequiredFollows) {
  const required = requiredAccounts.map((a) => a.toLowerCase());
  const followed = (followedAccounts || []).map((a) => a.toLowerCase());
  const min = getEffectiveMinRequiredFollows(required, minRequiredFollows);
  const matched = required.filter((acc) => followed.includes(acc));
  const missing = required.filter((acc) => !followed.includes(acc));
  return {
    followed: matched,
    missing,
    meetsRequirement: matched.length >= min,
    minRequired: min,
  };
}

export function getFollowRuleSummary(requiredFollowAccounts, minRequiredFollows) {
  const accounts = parseFollowAccountList(requiredFollowAccounts);
  if (accounts.length === 0 || minRequiredFollows <= 0) return null;
  const min = getEffectiveMinRequiredFollows(accounts, minRequiredFollows);
  const handles = accounts.map((a) => `@${a}`).join(', ');
  if (min >= accounts.length) {
    return `Takip şartı: ${handles} hesaplarının tümünü takip etmek zorunlu`;
  }
  return `Takip şartı: ${handles} listesinden en az ${min} hesabı takip etmek zorunlu`;
}

export function buildFollowVerifyRequest(participants, requiredFollowAccounts, minRequiredFollows) {
  const accounts = parseFollowAccountList(requiredFollowAccounts);
  return {
    requestId: Date.now(),
    status: 'pending',
    participants: Array.from(new Set(participants.map((p) => p.replace(/^@+/, '').toLowerCase()))),
    requiredFollowAccounts: accounts,
    minRequiredFollows: getEffectiveMinRequiredFollows(accounts, minRequiredFollows),
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
    map[key] = {
      followed: (data.followed || []).map((a) => a.toLowerCase()),
      missing: (data.missing || []).map((a) => a.toLowerCase()),
      meetsRequirement: Boolean(data.meetsRequirement),
      verified: data.ok !== false,
      error: data.error || null,
      checkedVia: data.checkedVia || null,
      verifiedAt: payload.completedAt || data.verifiedAt || new Date().toISOString(),
    };
  });
  return map;
}
