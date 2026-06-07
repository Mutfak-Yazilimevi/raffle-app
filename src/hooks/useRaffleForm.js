import { useState, useEffect, useMemo, useRef } from 'react';
import { loadSetupState, saveSetupState } from '../utils/setupStorage';
import { downloadConfigTxt, parseConfigFromTxt } from '../utils/raffleConfigFile';
import { generateSetupStory } from '../utils/generateSetupStory';
import { generateStartingStory } from '../utils/generateStartingStory';
import { DEFAULT_STORY_BACKGROUND_ID } from '../utils/storyBackgrounds';
import {
  parseFollowAccountList,
  isFollowRuleActive,
  getEffectiveMinRequiredFollows,
  buildFollowVerifyRequest,
  normalizeFollowVerificationResults,
  FOLLOW_VERIFY_REQUEST_KEY,
  FOLLOW_VERIFY_RESULTS_KEY,
} from '../utils/followRules';
import { parseParticipationCriteria, PARTICIPATION_CRITERIA_DEFAULTS } from '../utils/participationCriteria';
import {
  aggregateParticipantsFromComments,
  buildParticipantCriteriaSummary,
  getActiveParticipantCriteriaColumns,
  getParticipantRulesContext,
  isUserBlacklisted,
  userHasBlacklistedKeyword,
} from '../utils/participantCriteriaSummary';
import { normalizeImportedComments, getUniqueParticipantUsernames } from '../utils/commentParsing';
import { resizeImageFromFile } from '../utils/resizeUploadedImage';

import { normalizeBrand, EMPTY_BRAND_SCHEDULE } from '../utils/raffleSchedule';

const EMPTY_BRAND = { name: '', logo: '', raffleName: '', postUrl: '', ...EMPTY_BRAND_SCHEDULE };
const EMPTY_PRIZE = () => ({ id: Date.now(), name: '', image: '', winnerCount: 1, substituteCount: 1 });

export function useRaffleForm({ importedComments, onClearImported, activeRaffleId }) {
  const [comments, setComments] = useState([]);
  const [brand, setBrand] = useState({ ...EMPTY_BRAND });
  const [prizes, setPrizes] = useState([EMPTY_PRIZE()]);
  const [entryMethod, setEntryMethod] = useState('one_per_user');
  const [minMentions, setMinMentions] = useState(0);
  const [mentionMode, setMentionMode] = useState('per_comment');
  const [weightedEntry, setWeightedEntry] = useState(false);
  const [uniqueMentions, setUniqueMentions] = useState(false);
  const [keywordRequired, setKeywordRequired] = useState('');
  const [keywordBlacklist, setKeywordBlacklist] = useState('');
  const [userBlacklist, setUserBlacklist] = useState('');
  const [requiredFollowAccounts, setRequiredFollowAccounts] = useState('');
  const [followVerification, setFollowVerification] = useState({});
  const [followVerifyMessage, setFollowVerifyMessage] = useState('');
  const [followVerifyPending, setFollowVerifyPending] = useState(false);
  const [requireComment, setRequireComment] = useState(PARTICIPATION_CRITERIA_DEFAULTS.requireComment);
  const [requireLike, setRequireLike] = useState(PARTICIPATION_CRITERIA_DEFAULTS.requireLike);
  const [requireSave, setRequireSave] = useState(PARTICIPATION_CRITERIA_DEFAULTS.requireSave);
  const [requireFollowAccounts, setRequireFollowAccounts] = useState(PARTICIPATION_CRITERIA_DEFAULTS.requireFollowAccounts);
  const [requireMentionRule, setRequireMentionRule] = useState(PARTICIPATION_CRITERIA_DEFAULTS.requireMentionRule);
  const [maxMentions, setMaxMentions] = useState(PARTICIPATION_CRITERIA_DEFAULTS.maxMentions);
  const [maxCommentsPerUser, setMaxCommentsPerUser] = useState(PARTICIPATION_CRITERIA_DEFAULTS.maxCommentsPerUser);
  const [allowMultipleCommentsBonus, setAllowMultipleCommentsBonus] = useState(PARTICIPATION_CRITERIA_DEFAULTS.allowMultipleCommentsBonus);
  const [requireStoryShare, setRequireStoryShare] = useState(PARTICIPATION_CRITERIA_DEFAULTS.requireStoryShare);
  const [requireStoryProofIfPrivate, setRequireStoryProofIfPrivate] = useState(PARTICIPATION_CRITERIA_DEFAULTS.requireStoryProofIfPrivate);
  const [requireMinAge, setRequireMinAge] = useState(PARTICIPATION_CRITERIA_DEFAULTS.requireMinAge);
  const [minAge, setMinAge] = useState(PARTICIPATION_CRITERIA_DEFAULTS.minAge);
  const [requireRealActiveAccount, setRequireRealActiveAccount] = useState(PARTICIPATION_CRITERIA_DEFAULTS.requireRealActiveAccount);
  const [disallowBusinessAccounts, setDisallowBusinessAccounts] = useState(PARTICIPATION_CRITERIA_DEFAULTS.disallowBusinessAccounts);
  const [showPrizeProductsInResultsStory, setShowPrizeProductsInResultsStory] = useState(false);
  const [storyBackgroundId, setStoryBackgroundId] = useState(DEFAULT_STORY_BACKGROUND_ID);
  const [storageWarning, setStorageWarning] = useState('');
  const [configMessage, setConfigMessage] = useState('');
  const [generatingSetupStory, setGeneratingSetupStory] = useState(false);
  const [generatingStartingStory, setGeneratingStartingStory] = useState(false);
  const [savingRaffle, setSavingRaffle] = useState(false);

  const configFileInputRef = useRef(null);

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
    () => parseParticipationCriteria({
      requireComment, requireLike, requireSave, requireFollowAccounts, requireMentionRule,
      maxMentions, maxCommentsPerUser, allowMultipleCommentsBonus,
      requireStoryShare, requireStoryProofIfPrivate, requireMinAge, minAge,
      requireRealActiveAccount, disallowBusinessAccounts,
    }),
    [requireComment, requireLike, requireSave, requireFollowAccounts, requireMentionRule, maxMentions, maxCommentsPerUser, allowMultipleCommentsBonus,
      requireStoryShare, requireStoryProofIfPrivate, requireMinAge, minAge,
      requireRealActiveAccount, disallowBusinessAccounts]
  );

  const buildPersistState = () => ({
    comments, brand, prizes,
    entryMethod, minMentions, mentionMode, weightedEntry,
    uniqueMentions, keywordRequired, keywordBlacklist, userBlacklist,
    requiredFollowAccounts,
    minRequiredFollows: effectiveMinRequiredFollows,
    followVerification,
    ...participationCriteria,
    showPrizeProductsInResultsStory,
    storyBackgroundId,
  });

  const getConfigState = () => ({
    brand, prizes, entryMethod, minMentions, mentionMode, weightedEntry,
    uniqueMentions, keywordRequired, keywordBlacklist, userBlacklist,
    requiredFollowAccounts,
    minRequiredFollows: effectiveMinRequiredFollows,
    ...participationCriteria,
    showPrizeProductsInResultsStory,
    storyBackgroundId,
  });

  const applyParticipationCriteria = (config) => {
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
  };

  const applyImportedConfig = async (config) => {
    let logo = config.brand?.logo || '';
    if (logo) {
      try {
        logo = await resizeUploadedImage(logo, 'logo');
      } catch {
        /* orijinal korunur */
      }
    }

    const importedPrizes = await Promise.all(
      (config.prizes || []).map(async (prize) => {
        let image = prize.image || '';
        if (image) {
          try {
            image = await resizeUploadedImage(image, 'prize');
          } catch {
            /* orijinal korunur */
          }
        }
        return { ...prize, image };
      })
    );

    setBrand(normalizeBrand({ ...config.brand, logo }));
    setPrizes(importedPrizes);
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
    if ((config.minMentions > 0 || config.maxMentions > 0 || config.uniqueMentions) && config.requireMentionRule == null) {
      setRequireMentionRule(true);
    }
    setShowPrizeProductsInResultsStory(Boolean(config.showPrizeProductsInResultsStory));
    setStoryBackgroundId(config.storyBackgroundId || DEFAULT_STORY_BACKGROUND_ID);
  };

  const applySavedState = (saved) => {
    if (saved.comments) setComments(saved.comments);
    else setComments([]);
    if (saved.brand) setBrand(normalizeBrand(saved.brand));
    if (saved.prizes) setPrizes(saved.prizes);
    if (saved.entryMethod) setEntryMethod(saved.entryMethod);
    if (saved.minMentions != null) setMinMentions(saved.minMentions);
    if (saved.mentionMode) setMentionMode(saved.mentionMode);
    if (saved.weightedEntry != null) setWeightedEntry(saved.weightedEntry);
    if (saved.uniqueMentions != null) setUniqueMentions(saved.uniqueMentions);
    if (saved.keywordRequired) setKeywordRequired(saved.keywordRequired);
    else setKeywordRequired('');
    if (saved.keywordBlacklist) setKeywordBlacklist(saved.keywordBlacklist);
    else setKeywordBlacklist('');
    if (saved.userBlacklist) setUserBlacklist(saved.userBlacklist);
    else setUserBlacklist('');
    if (saved.requiredFollowAccounts) setRequiredFollowAccounts(saved.requiredFollowAccounts);
    else setRequiredFollowAccounts('');
    if (saved.followVerification) setFollowVerification(saved.followVerification);
    else setFollowVerification({});
    applyParticipationCriteria(saved);
    if (saved.requiredFollowAccounts?.trim() && saved.requireFollowAccounts == null) {
      setRequireFollowAccounts(true);
    }
    if ((saved.minMentions > 0 || saved.maxMentions > 0 || saved.uniqueMentions) && saved.requireMentionRule == null) {
      setRequireMentionRule(true);
    }
    if (saved.showPrizeProductsInResultsStory != null) {
      setShowPrizeProductsInResultsStory(Boolean(saved.showPrizeProductsInResultsStory));
    }
    if (saved.storyBackgroundId) {
      setStoryBackgroundId(saved.storyBackgroundId);
    } else {
      setStoryBackgroundId(DEFAULT_STORY_BACKGROUND_ID);
    }
  };

  const resetForm = () => {
    setComments([]);
    setBrand({ ...EMPTY_BRAND });
    setPrizes([EMPTY_PRIZE()]);
    setEntryMethod('one_per_user');
    setMinMentions(0);
    setMentionMode('per_comment');
    setWeightedEntry(false);
    setUniqueMentions(false);
    setKeywordRequired('');
    setKeywordBlacklist('');
    setUserBlacklist('');
    setRequiredFollowAccounts('');
    setFollowVerification({});
    setFollowVerifyMessage('');
    setFollowVerifyPending(false);
    applyParticipationCriteria(PARTICIPATION_CRITERIA_DEFAULTS);
    setRequireFollowAccounts(false);
    setRequireMentionRule(false);
    setShowPrizeProductsInResultsStory(false);
    setStoryBackgroundId(DEFAULT_STORY_BACKGROUND_ID);
    setConfigMessage('');
  };

  useEffect(() => {
    if (!activeRaffleId) return undefined;
    let cancelled = false;

    loadSetupState(activeRaffleId).then((saved) => {
      if (cancelled) return;
      if (!saved) {
        resetForm();
        return;
      }
      applySavedState(saved);
      recompressStoredImages(saved);
    });

    return () => { cancelled = true; };
  }, [activeRaffleId]);

  const recompressStoredImages = async (saved) => {
    try {
      if (saved.brand?.logo) {
        const logo = await recompressIfNeeded(saved.brand.logo, 'logo');
        if (logo !== saved.brand.logo) {
          setBrand((prev) => ({ ...prev, logo }));
        }
      }
      if (saved.prizes?.length) {
        const prizesCompressed = await Promise.all(
          saved.prizes.map(async (prize) => {
            if (!prize.image) return prize;
            const image = await recompressIfNeeded(prize.image, 'prize');
            return image === prize.image ? prize : { ...prize, image };
          })
        );
        if (prizesCompressed.some((p, i) => p.image !== saved.prizes[i]?.image)) {
          setPrizes(prizesCompressed);
        }
      }
    } catch (err) {
      console.warn('Görsel sıkıştırma atlandı:', err);
    }
  };

  useEffect(() => {
    if (!activeRaffleId) return undefined;
    const timeoutId = window.setTimeout(() => {
      saveSetupState(buildPersistState(), activeRaffleId).then((saved) => {
        setStorageWarning(saved ? '' : 'Tarayıcı depolama alanı dolu olabilir; ayarlar tam kaydedilemedi.');
      });
    }, 400);
    return () => window.clearTimeout(timeoutId);
  }, [activeRaffleId, comments, brand, prizes, entryMethod, minMentions, mentionMode, weightedEntry, uniqueMentions, keywordRequired, keywordBlacklist, userBlacklist, requiredFollowAccounts, requireFollowAccounts, requireMentionRule, effectiveMinRequiredFollows, followVerification, participationCriteria, showPrizeProductsInResultsStory, storyBackgroundId]);

  useEffect(() => {
    const loadResults = () => {
      const raw = localStorage.getItem(FOLLOW_VERIFY_RESULTS_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        setFollowVerification(normalizeFollowVerificationResults(parsed));
        setFollowVerifyMessage(
          parsed.summary
            ? `Takip doğrulama tamamlandı: ${parsed.summary.passed}/${parsed.summary.total} katılımcı şartı sağlıyor.`
            : 'Takip doğrulama sonuçları yüklendi.',
        );
        setFollowVerifyPending(false);
        localStorage.removeItem(FOLLOW_VERIFY_REQUEST_KEY);
      } catch (err) {
        console.error('Takip doğrulama sonuçları okunamadı:', err);
      }
    };

    loadResults();

    const onStorage = (event) => {
      if (event.key === FOLLOW_VERIFY_RESULTS_KEY) loadResults();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!followRuleActive || comments.length === 0) {
      localStorage.removeItem(FOLLOW_VERIFY_REQUEST_KEY);
      return;
    }

    const participants = getUniqueParticipantUsernames(comments);
    const request = buildFollowVerifyRequest(participants, requiredFollowAccounts, requireFollowAccounts);
    localStorage.setItem(FOLLOW_VERIFY_REQUEST_KEY, JSON.stringify(request));
  }, [comments, followRuleActive, requiredFollowAccounts, requireFollowAccounts]);

  useEffect(() => {
    if (importedComments?.length > 0) {
      setComments(normalizeImportedComments(importedComments));
    }
  }, [importedComments]);

  const passesFollowRule = (username) => {
    if (!followRuleActive) return true;
    const verification = followVerification[username.toLowerCase()];
    if (!verification?.verified) return true;
    return verification.meetsRequirement !== false;
  };

  const getFollowStatusForUser = (username) => {
    if (!followRuleActive) return { status: 'na', label: '—' };
    const verification = followVerification[username.toLowerCase()];
    if (!verification?.verified) {
      return { status: 'pending', label: 'Doğrulanmadı' };
    }
    if (verification.meetsRequirement) {
      return { status: 'passed', label: 'Takip OK', verification };
    }
    return { status: 'failed', label: 'Takip eksik', verification };
  };

  const handlePrepareFollowVerification = () => {
    if (!followRuleActive) {
      alert('Önce takip edilmesi gereken hesapları tanımlayın.');
      return;
    }
    if (comments.length === 0) {
      alert('Doğrulama için önce yorumları yükleyin.');
      return;
    }
    const participants = getUniqueParticipantUsernames(comments);
    const request = buildFollowVerifyRequest(participants, requiredFollowAccounts, requireFollowAccounts);
    localStorage.setItem(FOLLOW_VERIFY_REQUEST_KEY, JSON.stringify(request));
    setFollowVerifyPending(true);
    const bulkHint = participants.length >= 60
      ? ' Büyük liste modu: zorunlu hesap profiline gidilir, takipçi popup listesi açılır ve katılımcılar eşleştirilir.'
      : '';
    setFollowVerifyMessage(`${participants.length} benzersiz katılımcı için doğrulama hazır.${bulkHint} Chrome eklentisini açıp "Takip Şartlarını Doğrula" butonuna basın. Zorunlu hesaplardan birine giriş yapmış olmalısınız.`);
  };

  const handleImageUpload = (e, callback, preset = 'prize') => {
    const file = e.target.files[0];
    if (!file) return;
    resizeImageFromFile(file, preset)
      .then(callback)
      .catch(() => alert('Görsel yüklenemedi. JPG veya PNG deneyin.'));
    e.target.value = '';
  };

  const addPrize = () => setPrizes([...prizes, { id: Date.now(), name: '', image: '', winnerCount: 1, substituteCount: 1 }]);
  const removePrize = (id) => { if (prizes.length > 1) setPrizes(prizes.filter((p) => p.id !== id)); };
  const updatePrize = (id, field, value) => setPrizes(prizes.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const clearData = () => {
    setComments([]);
    if (onClearImported) onClearImported();
  };

  const ticketsPool = useMemo(() => {
    if (comments.length === 0) return [];
    const blacklistedUsers = userBlacklist.split(',').map((u) => u.trim().toLowerCase().replace('@', '')).filter(Boolean);
    const blacklistedKeywords = keywordBlacklist.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
    const reqKeyword = keywordRequired.trim().toLowerCase();
    const userEntries = {};

    comments.forEach((comment) => {
      const username = comment.username.toLowerCase();
      if (blacklistedUsers.includes(username)) return;
      const textLower = comment.text.toLowerCase();
      if (reqKeyword && !textLower.includes(reqKeyword)) return;
      if (blacklistedKeywords.some((k) => textLower.includes(k))) return;

      const mentions = (comment.text.match(/@[a-zA-Z0-9._]+/g) || []).map((m) => m.replace('@', '').toLowerCase());
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

      let ticketCount = 0;
      if (requireMentionRule && minMentions > 0 && weightedEntry) ticketCount = Math.floor(totalUniqueMentions / minMentions);
      else if (entryMethod === 'one_per_user') ticketCount = 1;
      else ticketCount = commentsForTickets.length;

      for (let i = 0; i < ticketCount; i += 1) {
        tickets.push({
          username: userData.username,
          comment: entryMethod === 'one_per_comment' && !weightedEntry
            ? commentsForTickets[i]?.text || commentsForTickets[0].text
            : commentsForTickets[0].text,
          ticketIndex: i + 1,
          totalTickets: ticketCount,
        });
      }
    });
    return tickets;
  }, [comments, entryMethod, requireMentionRule, minMentions, maxMentions, maxCommentsPerUser, mentionMode, weightedEntry, uniqueMentions, keywordRequired, keywordBlacklist, userBlacklist, followRuleActive, followVerification]);

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

    return Object.values(byUser).map((userData) => {
      const key = userData.username.toLowerCase();
      const ticketCount = ticketByUser[key] || 0;
      const followStatus = getFollowStatusForUser(userData.username);
      const criteria = buildParticipantCriteriaSummary(userData, rulesContext, {
        ticketCount,
        followStatus,
        blacklistedUser: isUserBlacklisted(userData.username, userBlacklist),
        keywordBlocked: userHasBlacklistedKeyword(userData, keywordBlacklist),
      });

      return {
        username: userData.username,
        commentCount: userData.commentCount,
        ticketCount,
        followStatus,
        criteria,
      };
    }).sort(
      (a, b) => b.ticketCount - a.ticketCount
        || b.commentCount - a.commentCount
        || a.username.localeCompare(b.username, 'tr')
    );
  }, [
    comments, ticketsPool, followRuleActive, followVerification,
    participationCriteria, entryMethod, minMentions, mentionMode, weightedEntry, uniqueMentions,
    keywordRequired, keywordBlacklist, userBlacklist, requiredFollowAccounts,
    effectiveMinRequiredFollows,
  ]);

  const activeCriteriaColumns = useMemo(() => getActiveParticipantCriteriaColumns(
    getParticipantRulesContext({
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
    }),
  ), [
    participationCriteria, entryMethod, minMentions, mentionMode, weightedEntry, uniqueMentions,
    keywordRequired, keywordBlacklist, userBlacklist, requiredFollowAccounts,
    effectiveMinRequiredFollows,
  ]);

  const filteredOutCount = useMemo(
    () => participantStats.filter((p) => p.ticketCount === 0).length,
    [participantStats]
  );

  const handleSaveRaffle = async () => {
    if (!activeRaffleId) {
      setConfigMessage('Kaydetmek için önce bir çekiliş oluşturun.');
      return false;
    }
    if (!brand.raffleName?.trim()) {
      setConfigMessage('Çekiliş adını girdikten sonra kaydedebilirsiniz.');
      return false;
    }

    setSavingRaffle(true);
    try {
      const saved = await saveSetupState(buildPersistState(), activeRaffleId);
      setStorageWarning(saved ? '' : 'Tarayıcı depolama alanı dolu olabilir; ayarlar tam kaydedilemedi.');
      setConfigMessage(saved ? 'Çekiliş kaydedildi.' : 'Kayıt tamamlanamadı; depolama alanını kontrol edin.');
      return saved;
    } finally {
      setSavingRaffle(false);
    }
  };

  const handleExportConfigTxt = () => {
    const slug = brand.raffleName?.toLowerCase().replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'cekilis';
    downloadConfigTxt(getConfigState(), `${slug}_ayarlari.txt`);
    setConfigMessage('Ayar dosyası indirildi.');
  };

  const handleImportConfigTxt = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await applyImportedConfig(parseConfigFromTxt(event.target.result));
        setConfigMessage(`"${file.name}" dosyasından tanımlar yüklendi.`);
      } catch (err) {
        alert(err.message || 'Ayar dosyası okunamadı.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleGenerateSetupStory = async () => {
    setGeneratingSetupStory(true);
    try {
      await generateSetupStory(getConfigState());
      setConfigMessage('Ön duyuru story görseli indirildi.');
    } catch (err) {
      console.error(err);
      alert('Story görseli oluşturulurken bir hata oluştu.');
    } finally {
      setGeneratingSetupStory(false);
    }
  };

  const handleGenerateStartingStory = async () => {
    setGeneratingStartingStory(true);
    try {
      await generateStartingStory(getConfigState(), {
        participantCount: uniqueParticipantsCount,
        ticketCount: ticketsPool.length,
        prizeCount: prizes.length,
      });
      setConfigMessage('Çekiliş başlıyor story görseli indirildi.');
    } catch (err) {
      console.error(err);
      alert('Story görseli oluşturulurken bir hata oluştu.');
    } finally {
      setGeneratingStartingStory(false);
    }
  };

  const buildSetupConfig = () => ({
    ticketsPool, brand, prizes,
    rules: {
      entryMethod, minMentions, mentionMode, weightedEntry,
      uniqueMentions, keywordRequired, keywordBlacklist, userBlacklist,
      requiredFollowAccounts,
      minRequiredFollows: effectiveMinRequiredFollows,
      ...participationCriteria,
      showPrizeProductsInResultsStory,
      storyBackgroundId,
      followVerification,
    },
  });

  const validateStart = () => {
    if (ticketsPool.length === 0) {
      alert('Çekiliş havuzunda geçerli katılımcı bulunamadı. Lütfen yorum ekleyin veya kuralları gevşetin.');
      return false;
    }
    if (prizes.reduce((sum, p) => sum + parseInt(p.winnerCount || 0, 10), 0) < 1) {
      alert('Asil kazanan sayısı toplamda en az 1 olmalıdır.');
      return false;
    }
    return true;
  };

  return {
    brand, setBrand, prizes, addPrize, removePrize, updatePrize,
    entryMethod, setEntryMethod, minMentions, setMinMentions,
    mentionMode, setMentionMode, weightedEntry, setWeightedEntry,
    uniqueMentions, setUniqueMentions, keywordRequired, setKeywordRequired,
    keywordBlacklist, setKeywordBlacklist, userBlacklist, setUserBlacklist,
    requiredFollowAccounts, setRequiredFollowAccounts,
    requireFollowAccounts, setRequireFollowAccounts,
    requireMentionRule, setRequireMentionRule,
    followAccountList, followRuleActive, effectiveMinRequiredFollows,
    followVerification, followVerifyMessage, followVerifyPending,
    handlePrepareFollowVerification, getFollowStatusForUser,
    activeCriteriaColumns,
    requireComment, setRequireComment,
    requireLike, setRequireLike, requireSave, setRequireSave,
    maxMentions, setMaxMentions, maxCommentsPerUser, setMaxCommentsPerUser,
    allowMultipleCommentsBonus, setAllowMultipleCommentsBonus,
    requireStoryShare, setRequireStoryShare,
    requireStoryProofIfPrivate, setRequireStoryProofIfPrivate,
    requireMinAge, setRequireMinAge, minAge, setMinAge,
    requireRealActiveAccount, setRequireRealActiveAccount,
    disallowBusinessAccounts, setDisallowBusinessAccounts,
    participationCriteria,
    showPrizeProductsInResultsStory, setShowPrizeProductsInResultsStory,
    storyBackgroundId, setStoryBackgroundId,
    comments, clearData,
    handleImageUpload, ticketsPool, uniqueParticipantsCount, participantStats, filteredOutCount,
    storageWarning, configMessage, savingRaffle,
    generatingSetupStory, generatingStartingStory,
    handleSaveRaffle, handleExportConfigTxt, handleImportConfigTxt,
    handleGenerateSetupStory, handleGenerateStartingStory,
    configFileInputRef, buildSetupConfig, validateStart, resetForm,
  };
}
