import { useMemo } from 'react';
import { computeTicketsPool } from '../utils/ticketPool';
import {
  aggregateParticipantsFromComments,
  buildParticipantCriteriaSummary,
  getParticipantRulesContext,
  isUserBlacklisted,
  userHasBlacklistedKeyword,
} from '../utils/participantCriteriaSummary';

export function useTicketPool({
  comments,
  likers,
  passesFollowRule,
  getFollowStatusForUser,
  followRuleActive,
  followVerification,
  entryMethod,
  requireMentionRule,
  minMentions,
  maxMentions,
  maxCommentsPerUser,
  mentionMode,
  weightedEntry,
  uniqueMentions,
  keywordRequired,
  keywordBlacklist,
  userBlacklist,
  requireLike,
  participationCriteria,
  effectiveMinRequiredFollows,
  requiredFollowAccounts,
  postOwnerUsername,
}) {
  const ticketsPool = useMemo(
    () =>
      computeTicketsPool(comments, {
        entryMethod,
        requireMentionRule,
        minMentions,
        maxMentions,
        maxCommentsPerUser,
        mentionMode,
        weightedEntry,
        uniqueMentions,
        keywordRequired,
        keywordBlacklist,
        userBlacklist,
        postOwnerUsername,
        passesFollowRule,
        requireLike,
        likers,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [comments, entryMethod, requireMentionRule, minMentions, maxMentions, maxCommentsPerUser, mentionMode, weightedEntry, uniqueMentions, keywordRequired, keywordBlacklist, userBlacklist, postOwnerUsername, followRuleActive, followVerification, requireLike, likers]
  );

  const uniqueParticipantsCount = useMemo(
    () => new Set(ticketsPool.map((t) => t.username.toLowerCase())).size,
    [ticketsPool]
  );

  const participantStats = useMemo(() => {
    if (comments.length === 0) return [];

    const rulesContext = getParticipantRulesContext({
      ...participationCriteria,
      entryMethod,
      minMentions,
      mentionMode,
      weightedEntry,
      uniqueMentions,
      keywordRequired,
      keywordBlacklist,
      userBlacklist,
      requiredFollowAccounts,
      effectiveMinRequiredFollows,
    });

    const byUser = aggregateParticipantsFromComments(comments);
    const ticketByUser = {};

    ticketsPool.forEach((ticket) => {
      const key = ticket.username.toLowerCase();
      ticketByUser[key] = ticket.totalTickets;
    });

    return Object.values(byUser)
      .map((userData) => {
        const key = userData.username.toLowerCase();
        const ticketCount = ticketByUser[key] || 0;
        const followStatus = getFollowStatusForUser(userData.username);
        const criteria = buildParticipantCriteriaSummary(userData, rulesContext, {
          ticketCount,
          followStatus,
          blacklistedUser: isUserBlacklisted(userData.username, userBlacklist),
          keywordBlocked: userHasBlacklistedKeyword(userData, keywordBlacklist),
          liked:
            participationCriteria.requireLike && likers.size > 0
              ? likers.has(userData.username.toLowerCase())
              : null,
        });

        return {
          username: userData.username,
          commentCount: userData.commentCount,
          ticketCount,
          followStatus,
          criteria,
        };
      })
      .sort(
        (a, b) =>
          b.ticketCount - a.ticketCount ||
          b.commentCount - a.commentCount ||
          a.username.localeCompare(b.username, 'tr'),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    comments, ticketsPool, followRuleActive, followVerification,
    participationCriteria, entryMethod, minMentions, mentionMode, weightedEntry, uniqueMentions,
    keywordRequired, keywordBlacklist, userBlacklist, requiredFollowAccounts,
    effectiveMinRequiredFollows, likers,
  ]);

  const filteredOutCount = useMemo(
    () => participantStats.filter((p) => p.ticketCount === 0).length,
    [participantStats],
  );

  return {
    ticketsPool,
    uniqueParticipantsCount,
    participantStats,
    filteredOutCount,
  };
}
