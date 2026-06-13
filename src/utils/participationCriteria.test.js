import { describe, it, expect } from 'vitest';
import {
  PARTICIPATION_CRITERIA_DEFAULTS,
  parseParticipationCriteria,
  getParticipationCriteriaSummaryLines,
  getWinnerVerificationChecklist,
  hasAnyParticipationCriteria,
} from './participationCriteria';

describe('parseParticipationCriteria', () => {
  it('returns defaults for empty input', () => {
    const result = parseParticipationCriteria({});
    expect(result.requireComment).toBe(true);
    expect(result.requireLike).toBe(false);
    expect(result.minAge).toBe(18);
    expect(result.maxMentions).toBe(0);
  });

  it('coerces maxMentions to non-negative int', () => {
    expect(parseParticipationCriteria({ maxMentions: '5' }).maxMentions).toBe(5);
    expect(parseParticipationCriteria({ maxMentions: -3 }).maxMentions).toBe(0);
    expect(parseParticipationCriteria({ maxMentions: 'abc' }).maxMentions).toBe(0);
  });

  it('coerces minAge with fallback 18 for falsy 0, then at least 1', () => {
    expect(parseParticipationCriteria({ requireMinAge: true, minAge: 0 }).minAge).toBe(18);
    expect(parseParticipationCriteria({ requireMinAge: true, minAge: 21 }).minAge).toBe(21);
    expect(parseParticipationCriteria({ requireMinAge: true, minAge: 'abc' }).minAge).toBe(18);
  });

  it('treats requireComment=false as false', () => {
    expect(parseParticipationCriteria({ requireComment: false }).requireComment).toBe(false);
  });

  it('matches PARTICIPATION_CRITERIA_DEFAULTS shape', () => {
    const result = parseParticipationCriteria({});
    expect(Object.keys(result).sort()).toEqual(Object.keys(PARTICIPATION_CRITERIA_DEFAULTS).sort());
  });
});

describe('getParticipationCriteriaSummaryLines', () => {
  it('returns comment line when requireComment is true', () => {
    const lines = getParticipationCriteriaSummaryLines({ requireComment: true });
    expect(lines.some((l) => l.includes('yorum'))).toBe(true);
  });

  it('returns empty array when no criteria set', () => {
    const lines = getParticipationCriteriaSummaryLines({ requireComment: false });
    expect(lines).toHaveLength(0);
  });

  it('includes minAge line when requireMinAge is true', () => {
    const lines = getParticipationCriteriaSummaryLines({ requireMinAge: true, minAge: 21 });
    expect(lines.some((l) => l.includes('21'))).toBe(true);
  });
});

describe('getWinnerVerificationChecklist', () => {
  it('includes comment item when requireComment is true', () => {
    const items = getWinnerVerificationChecklist({ requireComment: true });
    expect(items.some((i) => i.id === 'comment')).toBe(true);
  });

  it('returns empty array when no criteria set', () => {
    expect(getWinnerVerificationChecklist({ requireComment: false })).toHaveLength(0);
  });

  it('includes all relevant items', () => {
    const rules = {
      requireComment: true,
      requireLike: true,
      requireSave: true,
      requireStoryShare: true,
      requireMinAge: true,
      minAge: 18,
      requireRealActiveAccount: true,
      disallowBusinessAccounts: true,
    };
    const items = getWinnerVerificationChecklist(rules);
    const ids = items.map((i) => i.id);
    expect(ids).toContain('comment');
    expect(ids).toContain('like');
    expect(ids).toContain('save');
    expect(ids).toContain('storyShare');
    expect(ids).toContain('minAge');
    expect(ids).toContain('realAccount');
    expect(ids).toContain('notBusiness');
  });
});

describe('hasAnyParticipationCriteria', () => {
  it('returns false for all-off rules', () => {
    expect(hasAnyParticipationCriteria({ requireComment: false })).toBe(false);
  });

  it('returns true when requireComment is true', () => {
    expect(hasAnyParticipationCriteria({ requireComment: true })).toBe(true);
  });

  it('returns true when requireLike is true', () => {
    expect(hasAnyParticipationCriteria({ requireLike: true })).toBe(true);
  });
});
