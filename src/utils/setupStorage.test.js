import { describe, it, expect } from 'vitest';
import { selectRafflesToPrune, MAX_RAFFLES } from './setupStorage';

function makeRaffles(count, startMs = 1_000_000) {
  // index 0 = oldest, son index = en yeni
  return Array.from({ length: count }, (_, i) => ({
    id: `r${i}`,
    updatedAt: new Date(startMs + i * 1000).toISOString(),
  }));
}

describe('selectRafflesToPrune', () => {
  it('sınırın altındaysa hiçbir şey budamaz', () => {
    const raffles = makeRaffles(MAX_RAFFLES);
    expect(selectRafflesToPrune(raffles, 'r0')).toEqual([]);
  });

  it('sınır tam doluysa budama yapmaz', () => {
    const raffles = makeRaffles(5);
    expect(selectRafflesToPrune(raffles, null, 5)).toEqual([]);
  });

  it('sınırı aşan en eski çekilişleri budar', () => {
    const raffles = makeRaffles(8);
    // 8 kayıt, sınır 5 → 3 en eski budanmalı (r0, r1, r2)
    expect(selectRafflesToPrune(raffles, null, 5)).toEqual(['r0', 'r1', 'r2']);
  });

  it('aktif çekilişi asla budamaz, sıradaki en eskiyi seçer', () => {
    const raffles = makeRaffles(8);
    // aktif r0 (en eski) korunur → r1, r2, r3 budanır
    expect(selectRafflesToPrune(raffles, 'r0', 5)).toEqual(['r1', 'r2', 'r3']);
  });

  it('budama listesi en eskiden yeniye sıralıdır (sıra karışık girilse de)', () => {
    const shuffled = [
      { id: 'b', updatedAt: '2026-01-03T00:00:00.000Z' },
      { id: 'a', updatedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'd', updatedAt: '2026-01-04T00:00:00.000Z' },
      { id: 'c', updatedAt: '2026-01-02T00:00:00.000Z' },
    ];
    expect(selectRafflesToPrune(shuffled, null, 2)).toEqual(['a', 'c']);
  });

  it('geçersiz girdi için boş dizi döner', () => {
    expect(selectRafflesToPrune(null, null)).toEqual([]);
    expect(selectRafflesToPrune(undefined, 'x')).toEqual([]);
  });
});
