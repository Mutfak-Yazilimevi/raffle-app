import { describe, it, expect } from 'vitest';
import {
  normalizeBrand,
  formatScheduleDateTime,
  hasScheduleInfo,
  getScheduleSummaryLines,
  pickBrandForStorage,
} from './raffleSchedule';

describe('normalizeBrand', () => {
  it('returns defaults for empty input', () => {
    const result = normalizeBrand({});
    expect(result.name).toBe('');
    expect(result.logo).toBe('');
    expect(result.raffleName).toBe('');
    expect(result.postUrl).toBe('');
    expect(result.entryStartDate).toBe('');
    expect(result.drawDate).toBe('');
  });

  it('preserves provided values', () => {
    const result = normalizeBrand({ name: 'Mutfak', raffleName: 'Bahar Çekilişi' });
    expect(result.name).toBe('Mutfak');
    expect(result.raffleName).toBe('Bahar Çekilişi');
  });

  it('normalizes schedule fields', () => {
    const result = normalizeBrand({ drawDate: '2026-06-20', drawTime: '14:00' });
    expect(result.drawDate).toBe('2026-06-20');
    expect(result.drawTime).toBe('14:00');
  });
});

describe('formatScheduleDateTime', () => {
  it('returns empty string for empty date', () => {
    expect(formatScheduleDateTime('', '')).toBe('');
    expect(formatScheduleDateTime(null, null)).toBe('');
  });

  it('formats date without time', () => {
    const result = formatScheduleDateTime('2026-06-20', '');
    expect(result).toContain('2026');
    expect(result).toContain('Haziran');
  });

  it('formats date with time', () => {
    const result = formatScheduleDateTime('2026-06-20', '14:30');
    expect(result).toContain('14:30');
    expect(result).toContain('2026');
  });

  it('pads single-digit hours in time', () => {
    const result = formatScheduleDateTime('2026-01-01', '9:5');
    expect(result).toContain('09:05');
  });
});

describe('hasScheduleInfo', () => {
  it('returns false when no schedule fields set', () => {
    expect(hasScheduleInfo({ name: 'Test' })).toBe(false);
  });

  it('returns true when drawDate is set', () => {
    expect(hasScheduleInfo({ drawDate: '2026-07-01' })).toBe(true);
  });

  it('returns true when entryStartDate is set', () => {
    expect(hasScheduleInfo({ entryStartDate: '2026-06-15' })).toBe(true);
  });
});

describe('getScheduleSummaryLines', () => {
  it('returns empty array when no schedule', () => {
    expect(getScheduleSummaryLines({})).toHaveLength(0);
  });

  it('includes entry start line', () => {
    const lines = getScheduleSummaryLines({ entryStartDate: '2026-06-01' });
    expect(lines.some((l) => l.includes('başlangıcı'))).toBe(true);
  });

  it('includes draw date line', () => {
    const lines = getScheduleSummaryLines({ drawDate: '2026-06-20' });
    expect(lines.some((l) => l.includes('ekiliş tarihi'))).toBe(true);
  });

  it('includes all three lines when all fields set', () => {
    const brand = {
      entryStartDate: '2026-06-01',
      entryEndDate: '2026-06-15',
      drawDate: '2026-06-20',
    };
    expect(getScheduleSummaryLines(brand)).toHaveLength(3);
  });
});

describe('pickBrandForStorage', () => {
  it('excludes logo from output', () => {
    const result = pickBrandForStorage({ name: 'X', logo: 'data:image/png;base64,...' });
    expect(result.logo).toBeUndefined();
  });

  it('includes schedule fields', () => {
    const result = pickBrandForStorage({ drawDate: '2026-06-20' });
    expect(result.drawDate).toBe('2026-06-20');
  });
});
