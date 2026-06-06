/** Opsiyonel katılım kriterleri — tümü isteğe bağlı */

export const PARTICIPATION_CRITERIA_DEFAULTS = {
  requireLike: false,
  requireSave: false,
  requireFollowAccounts: false,
  requireMentionRule: false,
  maxMentions: 0,
  maxCommentsPerUser: 0,
  allowMultipleCommentsBonus: false,
  requireStoryShare: false,
  requireStoryProofIfPrivate: false,
  requireMinAge: false,
  minAge: 18,
  requireRealActiveAccount: false,
  disallowBusinessAccounts: false,
};

export function parseParticipationCriteria(raw = {}) {
  return {
    requireLike: Boolean(raw.requireLike),
    requireSave: Boolean(raw.requireSave),
    requireFollowAccounts: Boolean(raw.requireFollowAccounts),
    requireMentionRule: Boolean(raw.requireMentionRule),
    maxMentions: Math.max(0, parseInt(raw.maxMentions, 10) || 0),
    maxCommentsPerUser: Math.max(0, parseInt(raw.maxCommentsPerUser, 10) || 0),
    allowMultipleCommentsBonus: Boolean(raw.allowMultipleCommentsBonus),
    requireStoryShare: Boolean(raw.requireStoryShare),
    requireStoryProofIfPrivate: Boolean(raw.requireStoryProofIfPrivate),
    requireMinAge: Boolean(raw.requireMinAge),
    minAge: Math.max(1, parseInt(raw.minAge, 10) || 18),
    requireRealActiveAccount: Boolean(raw.requireRealActiveAccount),
    disallowBusinessAccounts: Boolean(raw.disallowBusinessAccounts),
  };
}

export function getParticipationCriteriaSummaryLines(rules) {
  const c = parseParticipationCriteria(rules);
  const lines = [];

  const interactions = [];
  if (c.requireLike) interactions.push('gönderiyi beğenmek');
  if (c.requireSave) interactions.push('gönderiyi kaydetmek');
  if (interactions.length) {
    lines.push(`Temel etkileşim: ${interactions.join(', ')}`);
  }

  if (c.requireMentionRule && c.maxMentions > 0 && rules.minMentions > 0) {
    lines.push(`Etiket aralığı: ${rules.minMentions}–${c.maxMentions} kişi`);
  }

  if (c.maxCommentsPerUser > 0) {
    lines.push(`Kişi başına en fazla ${c.maxCommentsPerUser} yorum`);
  }
  if (c.allowMultipleCommentsBonus) {
    lines.push('Her ek yorum (farklı etiketlerle) ek çekiliş hakkı kazandırır');
  }

  if (c.requireStoryShare) {
    let storyLine = 'Gönderiyi kendi hikâyesinde paylaşmak';
    if (c.requireStoryProofIfPrivate) {
      storyLine += ' (gizli hesaplar görsel kanıt sunmalı)';
    }
    lines.push(storyLine);
  }

  if (c.requireMinAge) {
    lines.push(`Katılımcı en az ${c.minAge} yaşında olmalı`);
  }
  if (c.requireRealActiveAccount) {
    lines.push('Hesap gerçek ve aktif olmalı');
  }
  if (c.disallowBusinessAccounts) {
    lines.push('Ticari / işletme hesapları katılamaz');
  }

  return lines;
}

export function getWinnerVerificationChecklist(rules) {
  const c = parseParticipationCriteria(rules);
  const items = [];

  if (c.requireLike) {
    items.push({ id: 'like', label: 'Gönderiyi beğendi' });
  }
  if (c.requireSave) {
    items.push({ id: 'save', label: 'Gönderiyi kaydetti' });
  }
  if (c.requireStoryShare) {
    items.push({ id: 'storyShare', label: 'Hikâyede paylaştı' });
  }
  if (c.requireStoryProofIfPrivate) {
    items.push({ id: 'storyProof', label: 'Gizli hesap — story kanıtı sunuldu' });
  }
  if (c.requireMinAge) {
    items.push({ id: 'minAge', label: `${c.minAge} yaş ve üzeri` });
  }
  if (c.requireRealActiveAccount) {
    items.push({ id: 'realAccount', label: 'Gerçek / aktif hesap' });
  }
  if (c.disallowBusinessAccounts) {
    items.push({ id: 'notBusiness', label: 'Ticari / işletme hesabı değil' });
  }

  return items;
}

export function hasAnyParticipationCriteria(rules) {
  const c = parseParticipationCriteria(rules);
  return (
    c.requireLike ||
    c.requireSave ||
    c.requireFollowAccounts ||
    c.requireMentionRule ||
    c.maxMentions > 0 ||
    c.maxCommentsPerUser > 0 ||
    c.allowMultipleCommentsBonus ||
    c.requireStoryShare ||
    c.requireStoryProofIfPrivate ||
    c.requireMinAge ||
    c.requireRealActiveAccount ||
    c.disallowBusinessAccounts
  );
}
