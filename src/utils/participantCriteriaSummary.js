import { parseParticipationCriteria } from './participationCriteria';
import { isFollowRuleActive } from './followRules';

function extractMentions(text, username) {
  const self = username.toLowerCase();
  return (text.match(/@[a-zA-Z0-9._]+/g) || [])
    .map((m) => m.replace(/^@+/, '').toLowerCase())
    .filter((m) => m !== self);
}

export function aggregateParticipantsFromComments(comments) {
  const byUser = {};

  comments.forEach((comment) => {
    const key = comment.username.toLowerCase();
    if (!byUser[key]) {
      byUser[key] = {
        username: comment.username,
        commentCount: 0,
        comments: [],
        allMentions: new Set(),
        perCommentMentionCounts: [],
        keywordMatchCount: 0,
        blacklistedKeywordHit: false,
      };
    }

    const user = byUser[key];
    user.commentCount += 1;
    user.comments.push(comment.text);

    const mentions = extractMentions(comment.text, comment.username);
    user.perCommentMentionCounts.push(mentions.length);
    mentions.forEach((m) => user.allMentions.add(m));
  });

  return byUser;
}

export function getActiveParticipantCriteriaColumns(rules) {
  const c = parseParticipationCriteria(rules);
  const columns = [];

  if (c.requireComment !== false) {
    columns.push({ id: 'comment', label: 'Yorum' });
  }

  if (c.requireMentionRule) {
    columns.push({ id: 'mention', label: 'Etiket' });
  }

  if (rules.keywordRequired?.trim()) {
    columns.push({ id: 'keyword', label: 'Anahtar kelime' });
  }

  if (isFollowRuleActive(rules.requiredFollowAccounts, c.requireFollowAccounts)) {
    columns.push({ id: 'follow', label: 'Takip' });
  }

  if (c.requireLike) columns.push({ id: 'like', label: 'Beğeni' });
  if (c.requireSave) columns.push({ id: 'save', label: 'Kaydet' });
  if (c.requireStoryShare) columns.push({ id: 'storyShare', label: 'Hikâye paylaşımı' });
  if (c.requireStoryProofIfPrivate) columns.push({ id: 'storyProof', label: 'Story kanıtı' });
  if (c.requireMinAge) columns.push({ id: 'minAge', label: 'Yaş' });
  if (c.requireRealActiveAccount) columns.push({ id: 'realAccount', label: 'Gerçek hesap' });
  if (c.disallowBusinessAccounts) columns.push({ id: 'notBusiness', label: 'İşletme değil' });

  if (c.maxCommentsPerUser > 0) {
    columns.push({ id: 'commentCap', label: 'Yorum limiti' });
  }

  columns.push({ id: 'tickets', label: 'Hak' });

  return columns;
}

function evaluateMentionCriterion(userData, rules, c) {
  const totalUnique = userData.allMentions.size;
  const maxPerComment = userData.perCommentMentionCounts.length
    ? Math.max(...userData.perCommentMentionCounts)
    : 0;
  const modeLabel = rules.mentionMode === 'cumulative' ? 'Toplam' : 'En çok';
  const detected = rules.mentionMode === 'cumulative' ? totalUnique : maxPerComment;

  let value = `${modeLabel} ${detected} etiket`;
  if (rules.uniqueMentions && c.requireMentionRule) {
    value += ' (benzersiz)';
  }

  let status = 'passed';
  if (c.requireMentionRule && rules.minMentions > 0) {
    const compareValue = rules.mentionMode === 'cumulative' ? totalUnique : maxPerComment;
    if (compareValue < rules.minMentions) status = 'failed';
  }
  if (c.requireMentionRule && c.maxMentions > 0) {
    const compareValue = rules.mentionMode === 'cumulative' ? totalUnique : maxPerComment;
    if (compareValue > c.maxMentions) status = 'failed';
  }

  return { value, status };
}

function evaluateKeywordCriterion(userData, rules) {
  const keyword = rules.keywordRequired.trim().toLowerCase();
  const matchCount = userData.comments.filter((text) => text.toLowerCase().includes(keyword)).length;
  const value = matchCount > 0 ? `${matchCount} yorumda "${rules.keywordRequired.trim()}"` : 'Bulunamadı';
  return { value, status: matchCount > 0 ? 'passed' : 'failed' };
}

function evaluateFollowCriterion(followStatus) {
  if (!followStatus || followStatus.status === 'na') {
    return { value: '—', status: 'na' };
  }
  if (followStatus.status === 'pending') {
    return { value: 'Doğrulanmadı', status: 'pending' };
  }
  if (followStatus.status === 'passed') {
    const followed = followStatus.verification?.followed?.map((a) => `@${a}`).join(', ');
    return { value: followed ? `Takip OK (${followed})` : 'Takip OK', status: 'passed' };
  }
  const missing = followStatus.verification?.missing?.map((a) => `@${a}`).join(', ');
  return { value: missing ? `Eksik: ${missing}` : 'Takip eksik', status: 'failed' };
}

function evaluateManualCriterion() {
  return { value: 'Manuel kontrol', status: 'pending' };
}

export function buildParticipantCriteriaSummary(userData, rules, options = {}) {
  const c = parseParticipationCriteria(rules);
  const {
    ticketCount = 0,
    followStatus = null,
    blacklistedUser = false,
    keywordBlocked = false,
  } = options;

  const cells = {};
  const columns = getActiveParticipantCriteriaColumns(rules);

  columns.forEach((col) => {
    switch (col.id) {
      case 'comment':
        cells.comment = {
          value: `${userData.commentCount} yorum`,
          status: userData.commentCount > 0 ? 'passed' : 'failed',
        };
        break;
      case 'mention':
        cells.mention = evaluateMentionCriterion(userData, rules, c);
        break;
      case 'keyword':
        cells.keyword = evaluateKeywordCriterion(userData, rules);
        break;
      case 'follow':
        cells.follow = evaluateFollowCriterion(followStatus);
        break;
      case 'like':
        cells.like = evaluateManualCriterion('Beğeni');
        break;
      case 'save':
        cells.save = evaluateManualCriterion('Kaydet');
        break;
      case 'storyShare':
        cells.storyShare = evaluateManualCriterion('Hikâye');
        break;
      case 'storyProof':
        cells.storyProof = evaluateManualCriterion('Story kanıtı');
        break;
      case 'minAge':
        cells.minAge = { value: `En az ${c.minAge} yaş (manuel)`, status: 'pending' };
        break;
      case 'realAccount':
        cells.realAccount = evaluateManualCriterion('Gerçek hesap');
        break;
      case 'notBusiness':
        cells.notBusiness = evaluateManualCriterion('İşletme değil');
        break;
      case 'commentCap':
        cells.commentCap = {
          value: `${Math.min(userData.commentCount, c.maxCommentsPerUser)}/${c.maxCommentsPerUser} kullanıldı`,
          status: userData.commentCount <= c.maxCommentsPerUser ? 'passed' : 'failed',
        };
        break;
      case 'tickets': {
        let value = ticketCount > 0 ? `${ticketCount} hak` : '0 hak';
        if (
          rules.weightedEntry
          && c.requireMentionRule
          && rules.minMentions > 0
          && userData.allMentions.size > 0
        ) {
          value = `${ticketCount} hak · ${userData.allMentions.size} etiket ÷ ${rules.minMentions}`;
        } else if (rules.entryMethod === 'one_per_comment' && ticketCount > 0) {
          value = `${ticketCount} hak · ${userData.commentCount} yorum`;
        }
        cells.tickets = {
          value,
          status: ticketCount > 0 ? 'passed' : 'failed',
        };
        break;
      }
      default:
        break;
    }
  });

  if (blacklistedUser) {
    cells.blocked = { value: 'Kullanıcı kara listede', status: 'failed' };
  } else if (keywordBlocked) {
    cells.blocked = { value: 'Yasaklı kelime', status: 'failed' };
  }

  return { columns, cells };
}

export function getParticipantRulesContext(formState) {
  return {
    ...parseParticipationCriteria(formState),
    minMentions: formState.minMentions ?? 0,
    mentionMode: formState.mentionMode ?? 'per_comment',
    weightedEntry: Boolean(formState.weightedEntry),
    uniqueMentions: Boolean(formState.uniqueMentions),
    entryMethod: formState.entryMethod ?? 'one_per_user',
    keywordRequired: formState.keywordRequired ?? '',
    keywordBlacklist: formState.keywordBlacklist ?? '',
    userBlacklist: formState.userBlacklist ?? '',
    requiredFollowAccounts: formState.requiredFollowAccounts ?? '',
    minRequiredFollows: formState.effectiveMinRequiredFollows ?? 0,
  };
}

export function isUserBlacklisted(username, userBlacklist) {
  const list = (userBlacklist || '').split(',').map((u) => u.trim().toLowerCase().replace(/^@+/, '')).filter(Boolean);
  return list.includes(username.toLowerCase());
}

export function userHasBlacklistedKeyword(userData, keywordBlacklist) {
  const list = (keywordBlacklist || '').split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (list.length === 0) return false;
  return userData.comments.some((text) => {
    const lower = text.toLowerCase();
    return list.some((k) => lower.includes(k));
  });
}
