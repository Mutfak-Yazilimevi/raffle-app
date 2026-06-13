import { describe, it, expect } from 'vitest';
import {
  parseRawText,
  dedupeTopLevelComments,
  normalizeImportedComments,
  getUniqueParticipantUsernames,
  parseCSV,
} from './commentParsing';

describe('parseRawText', () => {
  it('parses username-then-comment format', () => {
    const input = 'ahmet\nHarika bir çekiliş @merve @can';
    const result = parseRawText(input);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ username: 'ahmet', text: 'Harika bir çekiliş @merve @can' });
  });

  it('parses "username: comment" colon format', () => {
    const result = parseRawText('merve_kaya: Katılıyorum @can');
    expect(result).toHaveLength(1);
    expect(result[0].username).toBe('merve_kaya');
    expect(result[0].text).toBe('Katılıyorum @can');
  });

  it('skips Instagram UI noise lines', () => {
    const input = 'ahmet\n3g\nHarika ürün!\nYanıtla\n5 gün\nBeğenildi';
    const result = parseRawText(input);
    expect(result.some((r) => r.text === 'Harika ürün!')).toBe(true);
    expect(result.some((r) => r.text === 'Yanıtla')).toBe(false);
  });

  it('returns empty array for empty input', () => {
    expect(parseRawText('')).toEqual([]);
    expect(parseRawText('   ')).toEqual([]);
  });

  it('parses multiple comments', () => {
    const input = 'user1: yorum1\nuser2: yorum2\nuser3: yorum3';
    expect(parseRawText(input)).toHaveLength(3);
  });
});

describe('dedupeTopLevelComments', () => {
  it('dedupes by id', () => {
    const comments = [
      { id: '1', username: 'a', text: 'x' },
      { id: '1', username: 'a', text: 'x' },
      { id: '2', username: 'b', text: 'y' },
    ];
    expect(dedupeTopLevelComments(comments)).toHaveLength(2);
  });

  it('dedupes id-less against id-bearing items by content key', () => {
    const comments = [
      { id: '1', username: 'a', text: 'same' },
      { username: 'a', text: 'same' },
    ];
    const result = dedupeTopLevelComments(comments);
    expect(result).toHaveLength(1);
  });

  it('does NOT dedupe two id-less items with same content', () => {
    const comments = [
      { username: 'a', text: 'same' },
      { username: 'a', text: 'same' },
    ];
    expect(dedupeTopLevelComments(comments)).toHaveLength(2);
  });

  it('returns [] for non-array', () => {
    expect(dedupeTopLevelComments(null)).toEqual([]);
    expect(dedupeTopLevelComments(undefined)).toEqual([]);
  });
});

describe('normalizeImportedComments', () => {
  it('strips leading @ from usernames', () => {
    const result = normalizeImportedComments([{ username: '@ahmet', text: 'merhaba' }]);
    expect(result[0].username).toBe('ahmet');
  });

  it('filters out replies', () => {
    const comments = [
      { username: 'a', text: 'top level' },
      { username: 'b', text: 'reply', isReply: true },
    ];
    const result = normalizeImportedComments(comments);
    expect(result).toHaveLength(1);
    expect(result[0].username).toBe('a');
  });

  it('filters entries missing username or text', () => {
    const comments = [
      { username: '', text: 'x' },
      { username: 'a', text: '' },
      { username: 'b', text: 'valid' },
    ];
    expect(normalizeImportedComments(comments)).toHaveLength(1);
  });

  it('returns [] for non-array input', () => {
    expect(normalizeImportedComments(null)).toEqual([]);
  });
});

describe('getUniqueParticipantUsernames', () => {
  it('returns lowercase unique usernames', () => {
    const comments = [
      { username: 'Alice', text: 'hi' },
      { username: 'ALICE', text: 'hi again' },
      { username: 'bob', text: 'hello' },
    ];
    const result = getUniqueParticipantUsernames(comments);
    expect(result).toHaveLength(2);
    expect(result).toContain('alice');
    expect(result).toContain('bob');
  });
});

describe('parseCSV', () => {
  it('parses comma-separated CSV with header', () => {
    const csv = 'username,comment\nahmet,merhaba\nmerve,katılıyorum';
    const result = parseCSV(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ username: 'ahmet', text: 'merhaba' });
  });

  it('parses semicolon-separated CSV', () => {
    const csv = 'kullanici;yorum\nali;evet';
    const result = parseCSV(csv);
    expect(result[0].username).toBe('ali');
    expect(result[0].text).toBe('evet');
  });

  it('falls back to positional columns when headers unrecognized', () => {
    const csv = 'col1,col2\nuser1,text1';
    const result = parseCSV(csv);
    expect(result[0]).toEqual({ username: 'user1', text: 'text1' });
  });

  it('returns [] for single-line input (no data rows)', () => {
    expect(parseCSV('header')).toEqual([]);
  });
});
