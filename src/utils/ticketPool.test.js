import { describe, it, expect } from 'vitest';
import { computeTicketsPool } from './ticketPool';

function c(username, text) {
  return { username, text };
}

describe('computeTicketsPool', () => {
  it('empty comments → empty pool', () => {
    expect(computeTicketsPool([])).toEqual([]);
  });

  it('1 · basic one_per_comment — each comment gets one ticket', () => {
    const comments = [c('alice', 'Harika!'), c('bob', 'Süper ürün')];
    const result = computeTicketsPool(comments, { entryMethod: 'one_per_comment' });
    expect(result).toHaveLength(2);
    const users = result.map((t) => t.username.toLowerCase());
    expect(users).toContain('alice');
    expect(users).toContain('bob');
  });

  it('2 · mention multiplier — weightedEntry=true, minMentions=2, 4 unique mentions → 2 tickets', () => {
    const comments = [c('alice', '@a @b @c @d güzel ürün')];
    const result = computeTicketsPool(comments, {
      requireMentionRule: true,
      minMentions: 2,
      weightedEntry: true,
      mentionMode: 'cumulative',
    });
    expect(result).toHaveLength(2);
    expect(result[0].totalTickets).toBe(2);
  });

  it('3 · multi-comment bonus — 3 comments from same user → 3 tickets', () => {
    const comments = [c('alice', 'yorum 1'), c('alice', 'yorum 2'), c('alice', 'yorum 3')];
    const result = computeTicketsPool(comments, { entryMethod: 'one_per_comment' });
    expect(result.filter((t) => t.username === 'alice')).toHaveLength(3);
  });

  it('4 · maxCommentsPerUser cap — 5 comments, limit=2 → 2 tickets', () => {
    const comments = Array.from({ length: 5 }, (_, i) => c('alice', `yorum ${i}`));
    const result = computeTicketsPool(comments, {
      entryMethod: 'one_per_comment',
      maxCommentsPerUser: 2,
    });
    expect(result.filter((t) => t.username === 'alice')).toHaveLength(2);
  });

  it('5 · per_comment mention filter — comment with 0 mentions excluded when minMentions=1', () => {
    const comments = [c('alice', 'mention yok'), c('bob', 'merhaba @can')];
    const result = computeTicketsPool(comments, {
      requireMentionRule: true,
      minMentions: 1,
      mentionMode: 'per_comment',
    });
    expect(result.find((t) => t.username === 'alice')).toBeUndefined();
    expect(result.find((t) => t.username === 'bob')).toBeDefined();
  });

  it('6 · keywordBlacklist — comment containing blacklisted word excluded', () => {
    const comments = [c('alice', 'spam kelime içeriyor'), c('bob', 'normal yorum')];
    const result = computeTicketsPool(comments, { keywordBlacklist: 'spam' });
    expect(result.find((t) => t.username === 'alice')).toBeUndefined();
    expect(result.find((t) => t.username === 'bob')).toBeDefined();
  });

  it('7 · userBlacklist — blacklisted user excluded entirely', () => {
    const comments = [c('spammer', 'katılıyorum'), c('alice', 'katılıyorum')];
    const result = computeTicketsPool(comments, { userBlacklist: 'spammer' });
    expect(result.find((t) => t.username === 'spammer')).toBeUndefined();
    expect(result.find((t) => t.username === 'alice')).toBeDefined();
  });

  it('8 · one_per_user — 3 comments from same user → exactly 1 ticket', () => {
    const comments = [c('alice', 'y1'), c('alice', 'y2'), c('alice', 'y3')];
    const result = computeTicketsPool(comments, { entryMethod: 'one_per_user' });
    expect(result.filter((t) => t.username === 'alice')).toHaveLength(1);
  });

  it('9 · requireLike — user not in likers set excluded', () => {
    const comments = [c('alice', 'güzel'), c('bob', 'harika')];
    const likers = new Set(['bob']);
    const result = computeTicketsPool(comments, { requireLike: true, likers });
    expect(result.find((t) => t.username === 'alice')).toBeUndefined();
    expect(result.find((t) => t.username === 'bob')).toBeDefined();
  });

  it('10 · cumulative mention mode — 4 unique mentions across 3 comments, minMentions=3 → passes', () => {
    const comments = [
      c('alice', '@a @b bir yorum'),
      c('alice', '@c farklı yorum'),
      c('alice', '@d başka yorum'),
    ];
    const result = computeTicketsPool(comments, {
      requireMentionRule: true,
      minMentions: 3,
      mentionMode: 'cumulative',
    });
    expect(result.find((t) => t.username === 'alice')).toBeDefined();
  });

  it('11 · passesFollowRule callback — user failing follow excluded', () => {
    const comments = [c('alice', 'katılıyorum'), c('bob', 'bende katılıyorum')];
    const passesFollowRule = (u) => u.toLowerCase() !== 'alice';
    const result = computeTicketsPool(comments, { passesFollowRule });
    expect(result.find((t) => t.username === 'alice')).toBeUndefined();
    expect(result.find((t) => t.username === 'bob')).toBeDefined();
  });

  it('12 · ticket indices are sequential and totalTickets is accurate', () => {
    const comments = [c('alice', 'y1'), c('alice', 'y2'), c('alice', 'y3')];
    const result = computeTicketsPool(comments, { entryMethod: 'one_per_comment' });
    expect(result.map((t) => t.ticketIndex)).toEqual([1, 2, 3]);
    expect(result[0].totalTickets).toBe(3);
  });

  it('13 · keywordRequired — comment missing required keyword excluded', () => {
    const comments = [c('alice', 'katılıyorum'), c('bob', 'katılıyorum çekiliş')];
    const result = computeTicketsPool(comments, { keywordRequired: 'çekiliş' });
    expect(result.find((t) => t.username === 'alice')).toBeUndefined();
    expect(result.find((t) => t.username === 'bob')).toBeDefined();
  });

  it('14 · maxMentions per_comment — comment with too many mentions excluded', () => {
    const comments = [
      c('alice', '@a @b @c @d dört mention'),
      c('bob', '@x tek mention'),
    ];
    const result = computeTicketsPool(comments, {
      requireMentionRule: true,
      maxMentions: 2,
      mentionMode: 'per_comment',
    });
    expect(result.find((t) => t.username === 'alice')).toBeUndefined();
    expect(result.find((t) => t.username === 'bob')).toBeDefined();
  });
});
