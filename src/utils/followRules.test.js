import { describe, it, expect } from 'vitest';
import {
  parseFollowAccountList,
  isFollowRuleActive,
  getEffectiveMinRequiredFollows,
  evaluateFollowRequirement,
  getFollowRuleSummary,
  normalizeFollowVerificationResults,
} from './followRules';

describe('parseFollowAccountList', () => {
  it('parses comma-separated handles', () => {
    const result = parseFollowAccountList('mutfak, yemek, tatli');
    expect(result).toEqual(['mutfak', 'yemek', 'tatli']);
  });

  it('strips leading @ signs', () => {
    const result = parseFollowAccountList('@mutfak,@yemek');
    expect(result).toEqual(['mutfak', 'yemek']);
  });

  it('deduplicates handles', () => {
    const result = parseFollowAccountList('mutfak,mutfak,MUTFAK');
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('mutfak');
  });

  it('filters invalid handles', () => {
    const result = parseFollowAccountList('valid, inv alid!, @ok');
    expect(result).not.toContain('inv alid!');
    expect(result).toContain('valid');
    expect(result).toContain('ok');
  });

  it('parses newline-separated handles', () => {
    const result = parseFollowAccountList('mutfak\nyemek\ntatli');
    expect(result).toHaveLength(3);
  });

  it('returns [] for empty or non-string input', () => {
    expect(parseFollowAccountList('')).toEqual([]);
    expect(parseFollowAccountList(null)).toEqual([]);
    expect(parseFollowAccountList(42)).toEqual([]);
  });
});

describe('isFollowRuleActive', () => {
  it('returns false when requireFollowAccounts is false', () => {
    expect(isFollowRuleActive('mutfak', false)).toBe(false);
  });

  it('returns false when accounts list is empty', () => {
    expect(isFollowRuleActive('', true)).toBe(false);
  });

  it('returns true when enabled and accounts present', () => {
    expect(isFollowRuleActive('mutfak,yemek', true)).toBe(true);
  });
});

describe('getEffectiveMinRequiredFollows', () => {
  it('returns length of accounts array', () => {
    expect(getEffectiveMinRequiredFollows(['a', 'b', 'c'])).toBe(3);
    expect(getEffectiveMinRequiredFollows([])).toBe(0);
  });
});

describe('evaluateFollowRequirement', () => {
  const required = ['mutfak', 'yemek'];

  it('passes when all required accounts are followed', () => {
    const result = evaluateFollowRequirement(['mutfak', 'yemek'], required, 2);
    expect(result.meetsRequirement).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('fails when minimum not reached', () => {
    const result = evaluateFollowRequirement(['mutfak'], required, 2);
    expect(result.meetsRequirement).toBe(false);
    expect(result.missing).toContain('yemek');
  });

  it('is case-insensitive', () => {
    const result = evaluateFollowRequirement(['MUTFAK', 'YEMEK'], required, 2);
    expect(result.meetsRequirement).toBe(true);
  });

  it('uses default minRequired from required length when not provided', () => {
    const result = evaluateFollowRequirement(['mutfak'], required);
    expect(result.minRequired).toBe(2);
    expect(result.meetsRequirement).toBe(false);
  });

  it('handles empty followedAccounts', () => {
    const result = evaluateFollowRequirement(null, required, 1);
    expect(result.meetsRequirement).toBe(false);
    expect(result.followed).toHaveLength(0);
  });
});

describe('getFollowRuleSummary', () => {
  it('returns null when rule is inactive', () => {
    expect(getFollowRuleSummary('mutfak', false)).toBeNull();
  });

  it('returns null when account list is empty', () => {
    expect(getFollowRuleSummary('', true)).toBeNull();
  });

  it('returns singular form for one account', () => {
    const result = getFollowRuleSummary('mutfak', true);
    expect(result).toContain('@mutfak');
    expect(result).toContain('takip');
  });

  it('returns plural form for multiple accounts', () => {
    const result = getFollowRuleSummary('mutfak,yemek', true);
    expect(result).toContain('@mutfak');
    expect(result).toContain('@yemek');
  });
});

describe('normalizeFollowVerificationResults', () => {
  it('returns {} for null/undefined input', () => {
    expect(normalizeFollowVerificationResults(null)).toEqual({});
    expect(normalizeFollowVerificationResults(undefined)).toEqual({});
  });

  it('normalizes usernames to lowercase and strips @', () => {
    const payload = {
      results: {
        '@Alice': { followed: ['mutfak'], missing: [], meetsRequirement: true },
      },
    };
    const result = normalizeFollowVerificationResults(payload);
    expect(result).toHaveProperty('alice');
    expect(result.alice.meetsRequirement).toBe(true);
  });

  it('sets verified=false when ok is false', () => {
    const payload = {
      results: {
        user: { followed: [], missing: ['a'], meetsRequirement: false, ok: false },
      },
    };
    const result = normalizeFollowVerificationResults(payload);
    expect(result.user.verified).toBe(false);
  });
});
