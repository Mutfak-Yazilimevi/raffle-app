export const BRAND_SCHEDULE_FIELDS = [
  'entryStartDate',
  'entryStartTime',
  'entryEndDate',
  'entryEndTime',
  'drawDate',
  'drawTime',
];

export const EMPTY_BRAND_SCHEDULE = {
  entryStartDate: '',
  entryStartTime: '',
  entryEndDate: '',
  entryEndTime: '',
  drawDate: '',
  drawTime: '',
};

function pickScheduleFields(source = {}) {
  return BRAND_SCHEDULE_FIELDS.reduce((acc, key) => {
    acc[key] = source?.[key] || '';
    return acc;
  }, {});
}

export function normalizeBrand(brand = {}) {
  return {
    name: brand.name || '',
    logo: brand.logo || '',
    raffleName: brand.raffleName || '',
    postUrl: brand.postUrl || '',
    ...EMPTY_BRAND_SCHEDULE,
    ...pickScheduleFields(brand),
  };
}

function formatDatePart(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateStr;
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTimePart(timeStr) {
  if (!timeStr) return '';
  const [hour, minute] = timeStr.split(':');
  if (hour == null || minute == null) return timeStr;
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

export function formatScheduleDateTime(dateStr, timeStr) {
  const dateLabel = formatDatePart(dateStr);
  if (!dateLabel) return '';
  const timeLabel = formatTimePart(timeStr);
  return timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel;
}

export function hasScheduleInfo(brand) {
  const normalized = normalizeBrand(brand);
  return BRAND_SCHEDULE_FIELDS.some((key) => Boolean(normalized[key]?.trim()));
}

export function getScheduleSummaryLines(brand) {
  const b = normalizeBrand(brand);
  const lines = [];

  if (b.entryStartDate) {
    lines.push(`Katılım başlangıcı: ${formatScheduleDateTime(b.entryStartDate, b.entryStartTime)}`);
  }
  if (b.entryEndDate) {
    lines.push(`Katılım bitişi: ${formatScheduleDateTime(b.entryEndDate, b.entryEndTime)}`);
  }
  if (b.drawDate) {
    lines.push(`Çekiliş tarihi: ${formatScheduleDateTime(b.drawDate, b.drawTime)}`);
  }

  return lines;
}

export function pickBrandForStorage(brand = {}) {
  const normalized = normalizeBrand(brand);
  return {
    name: normalized.name,
    raffleName: normalized.raffleName,
    postUrl: normalized.postUrl,
    ...pickScheduleFields(normalized),
  };
}
