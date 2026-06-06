import { getFollowRuleSummary } from './followRules';
import { getParticipationCriteriaSummaryLines, parseParticipationCriteria } from './participationCriteria';
import { APP_DISPLAY_NAME } from './appBranding';

const FILE_HEADER = `# ${APP_DISPLAY_NAME} Çekiliş Ayar Dosyası v1`;
const FILE_HINT = '# Çekiliş günü bu dosyayı yükleyerek marka, ödül ve kural tanımlarınızı geri getirin.';

export function buildConfigSnapshot(state) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    brand: {
      name: state.brand?.name || '',
      logo: state.brand?.logo || '',
      raffleName: state.brand?.raffleName || '',
      postUrl: state.brand?.postUrl || '',
    },
    prizes: (state.prizes || []).map((prize, index) => ({
      id: prize.id || Date.now() + index,
      name: prize.name || '',
      image: prize.image || '',
      winnerCount: parseInt(prize.winnerCount, 10) || 1,
      substituteCount: parseInt(prize.substituteCount, 10) || 0,
    })),
    rules: {
      entryMethod: state.entryMethod || 'one_per_user',
      minMentions: state.minMentions ?? 0,
      mentionMode: state.mentionMode || 'per_comment',
      weightedEntry: Boolean(state.weightedEntry),
      uniqueMentions: Boolean(state.uniqueMentions),
      keywordRequired: state.keywordRequired || '',
      keywordBlacklist: state.keywordBlacklist || '',
      userBlacklist: state.userBlacklist || '',
      showPrizeProductsInResultsStory: Boolean(state.showPrizeProductsInResultsStory),
      storyBackgroundId: state.storyBackgroundId || 'insta-gradient',
      requiredFollowAccounts: state.requiredFollowAccounts || '',
      ...parseParticipationCriteria(state),
    },
  };
}

export function serializeConfigToTxt(snapshot) {
  return `${FILE_HEADER}\n${FILE_HINT}\n\n${JSON.stringify(snapshot, null, 2)}`;
}

export function parseConfigFromTxt(text) {
  const jsonStart = text.indexOf('{');
  if (jsonStart === -1) {
    throw new Error('Geçersiz ayar dosyası: JSON bulunamadı.');
  }

  const parsed = JSON.parse(text.slice(jsonStart));

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Geçersiz ayar dosyası.');
  }

  return {
    brand: {
      name: parsed.brand?.name || '',
      logo: parsed.brand?.logo || '',
      raffleName: parsed.brand?.raffleName || '',
      postUrl: parsed.brand?.postUrl || '',
    },
    prizes: Array.isArray(parsed.prizes) && parsed.prizes.length > 0
      ? parsed.prizes.map((prize, index) => ({
          id: prize.id || Date.now() + index,
          name: prize.name || '',
          image: prize.image || '',
          winnerCount: Math.max(1, parseInt(prize.winnerCount, 10) || 1),
          substituteCount: Math.max(0, parseInt(prize.substituteCount, 10) || 0),
        }))
      : [{ id: Date.now(), name: '', image: '', winnerCount: 1, substituteCount: 1 }],
    entryMethod: parsed.rules?.entryMethod === 'one_per_comment' ? 'one_per_comment' : 'one_per_user',
    minMentions: Math.max(0, parseInt(parsed.rules?.minMentions, 10) || 0),
    mentionMode: parsed.rules?.mentionMode === 'cumulative' ? 'cumulative' : 'per_comment',
    weightedEntry: Boolean(parsed.rules?.weightedEntry),
    uniqueMentions: Boolean(parsed.rules?.uniqueMentions),
    keywordRequired: parsed.rules?.keywordRequired || '',
    keywordBlacklist: parsed.rules?.keywordBlacklist || '',
    userBlacklist: parsed.rules?.userBlacklist || '',
    showPrizeProductsInResultsStory: Boolean(parsed.rules?.showPrizeProductsInResultsStory),
    storyBackgroundId: parsed.rules?.storyBackgroundId || 'insta-gradient',
    requiredFollowAccounts: parsed.rules?.requiredFollowAccounts || '',
    ...parseParticipationCriteria(parsed.rules || {}),
  };
}

export function downloadConfigTxt(state, filename = 'cekilis_ayarlari.txt') {
  const content = serializeConfigToTxt(buildConfigSnapshot(state));
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function entryMethodLabel(method) {
  return method === 'one_per_comment' ? 'Her yorum bir hak' : 'Her kullanıcıya tek hak';
}

export function getRulesSummaryLines(rules) {
  const c = parseParticipationCriteria(rules);
  const lines = [];

  if (c.requireComment) {
    lines.push(`Katılım: ${entryMethodLabel(rules.entryMethod)}`);

    if (rules.requireMentionRule && rules.minMentions > 0) {
      lines.push(`En az ${rules.minMentions} etiket (${rules.mentionMode === 'cumulative' ? 'toplam' : 'yorum başı'})`);
    }
    if (rules.requireMentionRule && rules.weightedEntry) lines.push('Ağırlıklı hak aktif');
    if (rules.requireMentionRule && rules.uniqueMentions) lines.push('Benzersiz etiket zorunlu');
    if (rules.keywordRequired?.trim()) lines.push(`Zorunlu: ${rules.keywordRequired.trim()}`);
    if (rules.keywordBlacklist?.trim()) lines.push('Yasaklı kelime filtresi var');
    if (rules.userBlacklist?.trim()) lines.push('Engelli kullanıcı listesi var');
  }

  const followLine = getFollowRuleSummary(rules.requiredFollowAccounts, rules.requireFollowAccounts);
  if (followLine) lines.push(followLine);

  lines.push(...getParticipationCriteriaSummaryLines(rules));

  return lines;
}
