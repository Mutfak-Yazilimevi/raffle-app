import { useState, useMemo } from 'react';
import {
  parseFollowAccountList,
  isFollowRuleActive,
  getEffectiveMinRequiredFollows,
} from '../utils/followRules';
import {
  parseParticipationCriteria,
  PARTICIPATION_CRITERIA_DEFAULTS,
} from '../utils/participationCriteria';
import { getActiveParticipantCriteriaColumns, getParticipantRulesContext } from '../utils/participantCriteriaSummary';

export function useParticipationRules() {
  const [entryMethod, setEntryMethod] = useState('one_per_user');
  const [minMentions, setMinMentions] = useState(0);
  const [mentionMode, setMentionMode] = useState('per_comment');
  const [weightedEntry, setWeightedEntry] = useState(false);
  const [uniqueMentions, setUniqueMentions] = useState(false);
  const [keywordRequired, setKeywordRequired] = useState('');
  const [keywordBlacklist, setKeywordBlacklist] = useState('');
  const [userBlacklist, setUserBlacklist] = useState('');
  const [requiredFollowAccounts, setRequiredFollowAccounts] = useState('');
  const [requireFollowAccounts, setRequireFollowAccounts] = useState(
    PARTICIPATION_CRITERIA_DEFAULTS.requireFollowAccounts
  );
  const [requireMentionRule, setRequireMentionRule] = useState(
    PARTICIPATION_CRITERIA_DEFAULTS.requireMentionRule
  );
  const [maxMentions, setMaxMentions] = useState(PARTICIPATION_CRITERIA_DEFAULTS.maxMentions);
  const [maxCommentsPerUser, setMaxCommentsPerUser] = useState(
    PARTICIPATION_CRITERIA_DEFAULTS.maxCommentsPerUser
  );
  const [allowMultipleCommentsBonus, setAllowMultipleCommentsBonus] = useState(
    PARTICIPATION_CRITERIA_DEFAULTS.allowMultipleCommentsBonus
  );
  const [requireComment, setRequireComment] = useState(PARTICIPATION_CRITERIA_DEFAULTS.requireComment);
  const [requireLike, setRequireLike] = useState(PARTICIPATION_CRITERIA_DEFAULTS.requireLike);
  const [requireSave, setRequireSave] = useState(PARTICIPATION_CRITERIA_DEFAULTS.requireSave);
  const [requireStoryShare, setRequireStoryShare] = useState(
    PARTICIPATION_CRITERIA_DEFAULTS.requireStoryShare
  );
  const [requireStoryProofIfPrivate, setRequireStoryProofIfPrivate] = useState(
    PARTICIPATION_CRITERIA_DEFAULTS.requireStoryProofIfPrivate
  );
  const [requireMinAge, setRequireMinAge] = useState(PARTICIPATION_CRITERIA_DEFAULTS.requireMinAge);
  const [minAge, setMinAge] = useState(PARTICIPATION_CRITERIA_DEFAULTS.minAge);
  const [requireRealActiveAccount, setRequireRealActiveAccount] = useState(
    PARTICIPATION_CRITERIA_DEFAULTS.requireRealActiveAccount
  );
  const [disallowBusinessAccounts, setDisallowBusinessAccounts] = useState(
    PARTICIPATION_CRITERIA_DEFAULTS.disallowBusinessAccounts
  );

  const followAccountList = useMemo(
    () => parseFollowAccountList(requiredFollowAccounts),
    [requiredFollowAccounts]
  );

  const followRuleActive = useMemo(
    () => isFollowRuleActive(requiredFollowAccounts, requireFollowAccounts),
    [requiredFollowAccounts, requireFollowAccounts]
  );

  const effectiveMinRequiredFollows = useMemo(
    () => (followRuleActive ? getEffectiveMinRequiredFollows(followAccountList) : 0),
    [followRuleActive, followAccountList]
  );

  const participationCriteria = useMemo(
    () =>
      parseParticipationCriteria({
        requireComment, requireLike, requireSave, requireFollowAccounts, requireMentionRule,
        maxMentions, maxCommentsPerUser, allowMultipleCommentsBonus,
        requireStoryShare, requireStoryProofIfPrivate, requireMinAge, minAge,
        requireRealActiveAccount, disallowBusinessAccounts,
      }),
    [
      requireComment, requireLike, requireSave, requireFollowAccounts, requireMentionRule,
      maxMentions, maxCommentsPerUser, allowMultipleCommentsBonus,
      requireStoryShare, requireStoryProofIfPrivate, requireMinAge, minAge,
      requireRealActiveAccount, disallowBusinessAccounts,
    ]
  );

  const activeCriteriaColumns = useMemo(
    () => getActiveParticipantCriteriaColumns(
      getParticipantRulesContext({
        ...participationCriteria,
        entryMethod, minMentions, mentionMode, weightedEntry, uniqueMentions,
        keywordRequired, keywordBlacklist, userBlacklist,
        requiredFollowAccounts, effectiveMinRequiredFollows,
      })
    ),
    [
      participationCriteria, entryMethod, minMentions, mentionMode, weightedEntry, uniqueMentions,
      keywordRequired, keywordBlacklist, userBlacklist, requiredFollowAccounts, effectiveMinRequiredFollows,
    ]
  );

  function applyParticipationCriteria(config) {
    const c = parseParticipationCriteria(config);
    setRequireComment(c.requireComment);
    setRequireLike(c.requireLike);
    setRequireSave(c.requireSave);
    setRequireFollowAccounts(c.requireFollowAccounts);
    setRequireMentionRule(c.requireMentionRule);
    setMaxMentions(c.maxMentions);
    setMaxCommentsPerUser(c.maxCommentsPerUser);
    setAllowMultipleCommentsBonus(c.allowMultipleCommentsBonus);
    setRequireStoryShare(c.requireStoryShare);
    setRequireStoryProofIfPrivate(c.requireStoryProofIfPrivate);
    setRequireMinAge(c.requireMinAge);
    setMinAge(c.minAge);
    setRequireRealActiveAccount(c.requireRealActiveAccount);
    setDisallowBusinessAccounts(c.disallowBusinessAccounts);
  }

  function applyRules(saved) {
    if (saved.entryMethod) setEntryMethod(saved.entryMethod);
    if (saved.minMentions != null) setMinMentions(saved.minMentions);
    if (saved.mentionMode) setMentionMode(saved.mentionMode);
    if (saved.weightedEntry != null) setWeightedEntry(saved.weightedEntry);
    if (saved.uniqueMentions != null) setUniqueMentions(saved.uniqueMentions);
    setKeywordRequired(saved.keywordRequired || '');
    setKeywordBlacklist(saved.keywordBlacklist || '');
    setUserBlacklist(saved.userBlacklist || '');
    setRequiredFollowAccounts(saved.requiredFollowAccounts || '');
    applyParticipationCriteria(saved);
    if (saved.requiredFollowAccounts?.trim() && saved.requireFollowAccounts == null) {
      setRequireFollowAccounts(true);
    }
    if (
      (saved.minMentions > 0 || saved.maxMentions > 0 || saved.uniqueMentions) &&
      saved.requireMentionRule == null
    ) {
      setRequireMentionRule(true);
    }
  }

  function applyImportedRules(config) {
    setEntryMethod(config.entryMethod);
    setMinMentions(config.minMentions);
    setMentionMode(config.mentionMode);
    setWeightedEntry(config.weightedEntry);
    setUniqueMentions(config.uniqueMentions);
    setKeywordRequired(config.keywordRequired);
    setKeywordBlacklist(config.keywordBlacklist);
    setUserBlacklist(config.userBlacklist);
    setRequiredFollowAccounts(config.requiredFollowAccounts || '');
    applyParticipationCriteria(config);
    if (config.requiredFollowAccounts?.trim() && config.requireFollowAccounts == null) {
      setRequireFollowAccounts(true);
    }
    if (
      (config.minMentions > 0 || config.maxMentions > 0 || config.uniqueMentions) &&
      config.requireMentionRule == null
    ) {
      setRequireMentionRule(true);
    }
  }

  function resetRules() {
    setEntryMethod('one_per_user');
    setMinMentions(0);
    setMentionMode('per_comment');
    setWeightedEntry(false);
    setUniqueMentions(false);
    setKeywordRequired('');
    setKeywordBlacklist('');
    setUserBlacklist('');
    setRequiredFollowAccounts('');
    applyParticipationCriteria(PARTICIPATION_CRITERIA_DEFAULTS);
    setRequireFollowAccounts(false);
  }

  function getRulesSnapshot() {
    return {
      entryMethod, minMentions, mentionMode, weightedEntry,
      uniqueMentions, keywordRequired, keywordBlacklist, userBlacklist,
      requiredFollowAccounts,
      minRequiredFollows: effectiveMinRequiredFollows,
      ...participationCriteria,
    };
  }

  return {
    entryMethod, setEntryMethod,
    minMentions, setMinMentions,
    mentionMode, setMentionMode,
    weightedEntry, setWeightedEntry,
    uniqueMentions, setUniqueMentions,
    keywordRequired, setKeywordRequired,
    keywordBlacklist, setKeywordBlacklist,
    userBlacklist, setUserBlacklist,
    requiredFollowAccounts, setRequiredFollowAccounts,
    requireFollowAccounts, setRequireFollowAccounts,
    requireMentionRule, setRequireMentionRule,
    maxMentions, setMaxMentions,
    maxCommentsPerUser, setMaxCommentsPerUser,
    allowMultipleCommentsBonus, setAllowMultipleCommentsBonus,
    requireComment, setRequireComment,
    requireLike, setRequireLike,
    requireSave, setRequireSave,
    requireStoryShare, setRequireStoryShare,
    requireStoryProofIfPrivate, setRequireStoryProofIfPrivate,
    requireMinAge, setRequireMinAge,
    minAge, setMinAge,
    requireRealActiveAccount, setRequireRealActiveAccount,
    disallowBusinessAccounts, setDisallowBusinessAccounts,
    followAccountList, followRuleActive, effectiveMinRequiredFollows,
    participationCriteria, activeCriteriaColumns,
    applyRules, applyImportedRules, applyParticipationCriteria, resetRules, getRulesSnapshot,
  };
}
