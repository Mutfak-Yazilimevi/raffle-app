export const BUILTIN_TEMPLATES = [
  {
    id: 'follow-tag',
    name: 'Takip Et + Etiketle',
    description: 'Hesabı takip et, 1 arkadaşını etiketle',
    rules: {
      entryMethod: 'one_per_user',
      requireComment: true,
      requireFollowAccounts: true,
      requireMentionRule: true,
      minMentions: 1,
      mentionMode: 'per_comment',
    },
  },
  {
    id: 'comment-only',
    name: 'Yalnızca Yorum',
    description: 'Yorum yapmak yeterli',
    rules: {
      entryMethod: 'one_per_user',
      requireComment: true,
    },
  },
  {
    id: 'follow-tag-like',
    name: 'Takip + Etiket + Beğeni',
    description: "Standart 3'lü katılım kuralı",
    rules: {
      entryMethod: 'one_per_user',
      requireComment: true,
      requireLike: true,
      requireFollowAccounts: true,
      requireMentionRule: true,
      minMentions: 1,
      mentionMode: 'per_comment',
    },
  },
  {
    id: 'multi-tag-weighted',
    name: 'Çoklu Etiket (Ağırlıklı)',
    description: 'Ne kadar çok etiket, o kadar çok hak',
    rules: {
      entryMethod: 'one_per_user',
      requireComment: true,
      requireMentionRule: true,
      minMentions: 1,
      mentionMode: 'cumulative',
      weightedEntry: true,
      uniqueMentions: true,
    },
  },
  {
    id: 'keyword-required',
    name: 'Anahtar Kelimeli Yorum',
    description: 'Yorumda belirli bir kelime/hashtag zorunlu',
    rules: {
      entryMethod: 'one_per_user',
      requireComment: true,
      keywordRequired: '',
    },
  },
];
