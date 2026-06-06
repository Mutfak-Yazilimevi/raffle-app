export const DEFAULT_STORY_BACKGROUND_ID = 'insta-gradient';

const darkPalette = {
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.88)',
  textMuted: 'rgba(255, 255, 255, 0.65)',
  textSoft: 'rgba(255, 255, 255, 0.55)',
  textFaint: 'rgba(255, 255, 255, 0.4)',
  accent: '#fccc63',
  cardFill: 'rgba(0, 0, 0, 0.25)',
  cardFillLight: 'rgba(0, 0, 0, 0.15)',
  divider: 'rgba(255, 255, 255, 0.12)',
  glassStroke: 'rgba(255, 255, 255, 0.15)',
};

const lightPalette = {
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textMuted: '#64748b',
  textSoft: '#94a3b8',
  textFaint: '#cbd5e1',
  accent: '#c2410c',
  cardFill: 'rgba(15, 23, 42, 0.07)',
  cardFillLight: 'rgba(15, 23, 42, 0.04)',
  divider: 'rgba(15, 23, 42, 0.1)',
  glassStroke: 'rgba(15, 23, 42, 0.12)',
};

export const STORY_BACKGROUNDS = [
  {
    id: 'insta-gradient',
    label: 'Instagram',
    description: 'Klasik pembe-mor gradient',
    preview: ['#f91f79', '#b92b97', '#773cb5'],
    background: {
      gradient: ['#f91f79', '#b92b97', '#773cb5'],
      orbs: [
        { x: 200, y: 300, r: 450, color: 'rgba(252, 204, 99, 0.15)' },
        { x: 880, y: 1600, r: 550, color: 'rgba(64, 93, 230, 0.18)' },
      ],
    },
    glass: { fill: 'rgba(255, 255, 255, 0.08)', stroke: 'rgba(255, 255, 255, 0.15)' },
    palette: darkPalette,
  },
  {
    id: 'midnight',
    label: 'Gece',
    description: 'Koyu lacivert ve mor tonları',
    preview: ['#0f172a', '#1e1b4b', '#4338ca'],
    background: {
      gradient: ['#0f172a', '#1e1b4b', '#312e81'],
      orbs: [
        { x: 180, y: 350, r: 420, color: 'rgba(99, 102, 241, 0.2)' },
        { x: 900, y: 1550, r: 520, color: 'rgba(56, 189, 248, 0.12)' },
      ],
    },
    glass: { fill: 'rgba(255, 255, 255, 0.06)', stroke: 'rgba(255, 255, 255, 0.12)' },
    palette: darkPalette,
  },
  {
    id: 'sunset',
    label: 'Gün Batımı',
    description: 'Turuncu, kırmızı ve mor geçişi',
    preview: ['#ea580c', '#dc2626', '#9333ea'],
    background: {
      gradient: ['#ea580c', '#dc2626', '#9333ea'],
      orbs: [
        { x: 220, y: 280, r: 440, color: 'rgba(252, 211, 77, 0.18)' },
        { x: 860, y: 1620, r: 540, color: 'rgba(244, 63, 94, 0.15)' },
      ],
    },
    glass: { fill: 'rgba(255, 255, 255, 0.08)', stroke: 'rgba(255, 255, 255, 0.14)' },
    palette: darkPalette,
  },
  {
    id: 'ocean',
    label: 'Okyanus',
    description: 'Mavi ve turkuaz tonları',
    preview: ['#0369a1', '#0e7490', '#4338ca'],
    background: {
      gradient: ['#0369a1', '#0e7490', '#4338ca'],
      orbs: [
        { x: 200, y: 320, r: 430, color: 'rgba(56, 189, 248, 0.2)' },
        { x: 880, y: 1580, r: 530, color: 'rgba(99, 102, 241, 0.16)' },
      ],
    },
    glass: { fill: 'rgba(255, 255, 255, 0.07)', stroke: 'rgba(255, 255, 255, 0.13)' },
    palette: darkPalette,
  },
  {
    id: 'emerald',
    label: 'Zümrüt',
    description: 'Yeşil ve camgöbeği tonları',
    preview: ['#047857', '#059669', '#0891b2'],
    background: {
      gradient: ['#047857', '#059669', '#0891b2'],
      orbs: [
        { x: 190, y: 300, r: 420, color: 'rgba(52, 211, 153, 0.18)' },
        { x: 890, y: 1600, r: 510, color: 'rgba(45, 212, 191, 0.14)' },
      ],
    },
    glass: { fill: 'rgba(255, 255, 255, 0.07)', stroke: 'rgba(255, 255, 255, 0.13)' },
    palette: darkPalette,
  },
  {
    id: 'rose-gold',
    label: 'Rose Gold',
    description: 'Bordo ve altın vurgular',
    preview: ['#881337', '#9f1239', '#78350f'],
    background: {
      gradient: ['#881337', '#9f1239', '#78350f'],
      orbs: [
        { x: 210, y: 310, r: 430, color: 'rgba(251, 191, 36, 0.16)' },
        { x: 870, y: 1590, r: 520, color: 'rgba(244, 63, 94, 0.14)' },
      ],
    },
    glass: { fill: 'rgba(255, 255, 255, 0.07)', stroke: 'rgba(255, 255, 255, 0.13)' },
    palette: darkPalette,
  },
  {
    id: 'pearl',
    label: 'İnci',
    description: 'Açık gri-beyaz, koyu metin',
    preview: ['#f8fafc', '#e2e8f0', '#cbd5e1'],
    background: {
      gradient: ['#f8fafc', '#eef2f7', '#dfe6ef'],
      orbs: [
        { x: 160, y: 380, r: 400, color: 'rgba(219, 39, 119, 0.07)' },
        { x: 920, y: 1520, r: 480, color: 'rgba(64, 93, 230, 0.06)' },
      ],
    },
    glass: { fill: 'rgba(255, 255, 255, 0.72)', stroke: 'rgba(15, 23, 42, 0.1)' },
    palette: lightPalette,
  },
  {
    id: 'champagne',
    label: 'Şampanya',
    description: 'Sıcak krem tonları, koyu metin',
    preview: ['#fffbeb', '#fde68a', '#fcd34d'],
    background: {
      gradient: ['#fffbeb', '#fef3c7', '#fde68a'],
      orbs: [
        { x: 200, y: 400, r: 380, color: 'rgba(234, 88, 12, 0.08)' },
        { x: 880, y: 1500, r: 460, color: 'rgba(219, 39, 119, 0.06)' },
      ],
    },
    glass: { fill: 'rgba(255, 255, 255, 0.55)', stroke: 'rgba(120, 53, 15, 0.12)' },
    palette: {
      ...lightPalette,
      accent: '#b45309',
    },
  },
];

export function resolveStoryTheme(storyBackgroundId) {
  const found = STORY_BACKGROUNDS.find((bg) => bg.id === storyBackgroundId);
  return found || STORY_BACKGROUNDS[0];
}
