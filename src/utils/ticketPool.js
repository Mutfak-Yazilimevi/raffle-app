/**
 * Core ticket pool computation — pure function, no React dependencies.
 * Extracted from useRaffleForm so the logic can be unit tested independently.
 *
 * @param {Array<{username: string, text: string}>} comments
 * @param {object} options
 * @returns {Array<{username, comment, ticketIndex, totalTickets}>}
 */
export function computeTicketsPool(comments, options = {}) {
  const {
    entryMethod = 'one_per_comment',
    requireMentionRule = false,
    minMentions = 0,
    maxMentions = 0,
    maxCommentsPerUser = 0,
    mentionMode = 'per_comment',
    weightedEntry = false,
    uniqueMentions = false,
    keywordRequired = '',
    keywordBlacklist = '',
    userBlacklist = '',
    postOwnerUsername = null,
    passesFollowRule = () => true,
    requireLike = false,
    likers = new Set(),
  } = options;

  if (comments.length === 0) return [];

  const blacklistedUsers = [
    ...userBlacklist.split(',').map((u) => u.trim().toLowerCase().replace('@', '')).filter(Boolean),
    ...(postOwnerUsername ? [postOwnerUsername.toLowerCase()] : []),
  ];
  const blacklistedKeywords = keywordBlacklist
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  const reqKeyword = keywordRequired.trim().toLowerCase();
  const userEntries = {};

  comments.forEach((comment) => {
    const username = comment.username.toLowerCase();
    if (blacklistedUsers.includes(username)) return;
    const textLower = comment.text.toLowerCase();
    if (reqKeyword && !textLower.includes(reqKeyword)) return;
    if (blacklistedKeywords.some((k) => textLower.includes(k))) return;

    const mentions = (comment.text.match(/@[a-zA-Z0-9._]+/g) || []).map((m) =>
      m.replace('@', '').toLowerCase()
    );
    let validMentions = [...mentions];
    if (requireMentionRule && uniqueMentions) {
      validMentions = Array.from(new Set(validMentions.filter((m) => m !== username)));
    }
    if (requireMentionRule && minMentions > 0 && mentionMode === 'per_comment' && validMentions.length < minMentions) return;
    if (requireMentionRule && maxMentions > 0 && mentionMode === 'per_comment' && validMentions.length > maxMentions) return;

    if (!userEntries[username]) {
      userEntries[username] = { username: comment.username, comments: [], allMentions: new Set() };
    }
    userEntries[username].comments.push({ text: comment.text, mentions: validMentions });
    validMentions.forEach((m) => userEntries[username].allMentions.add(m));
  });

  const tickets = [];
  Object.values(userEntries).forEach((userData) => {
    let commentsForTickets = userData.comments;
    if (maxCommentsPerUser > 0) {
      commentsForTickets = commentsForTickets.slice(0, maxCommentsPerUser);
    }
    if (commentsForTickets.length === 0) return;

    const totalUniqueMentions = userData.allMentions.size;
    if (requireMentionRule && minMentions > 0 && mentionMode === 'cumulative' && totalUniqueMentions < minMentions) return;
    if (requireMentionRule && maxMentions > 0 && mentionMode === 'cumulative' && totalUniqueMentions > maxMentions) return;
    if (!passesFollowRule(userData.username)) return;
    if (requireLike && likers.size > 0 && !likers.has(userData.username.toLowerCase())) return;

    let ticketCount = 0;
    if (requireMentionRule && minMentions > 0 && weightedEntry) {
      ticketCount = Math.floor(totalUniqueMentions / minMentions);
    } else if (entryMethod === 'one_per_user') {
      ticketCount = 1;
    } else {
      ticketCount = commentsForTickets.length;
    }

    for (let i = 0; i < ticketCount; i += 1) {
      tickets.push({
        username: userData.username,
        comment:
          entryMethod === 'one_per_comment' && !weightedEntry
            ? commentsForTickets[i]?.text || commentsForTickets[0].text
            : commentsForTickets[0].text,
        ticketIndex: i + 1,
        totalTickets: ticketCount,
      });
    }
  });

  return tickets;
}
