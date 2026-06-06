import { useState, useEffect, useMemo, useRef } from 'react';
import { loadSetupState, saveSetupState } from '../utils/setupStorage';
import { downloadConfigTxt, parseConfigFromTxt } from '../utils/raffleConfigFile';
import { generateSetupStory } from '../utils/generateSetupStory';
import { generateStartingStory } from '../utils/generateStartingStory';
import { DEFAULT_STORY_BACKGROUND_ID } from '../utils/storyBackgrounds';
import { MOCK_COMMENTS_PRESET, parseRawText, parseCSV } from '../utils/commentParsing';
import {
  parseFollowAccountList,
  isFollowRuleActive,
  getEffectiveMinRequiredFollows,
  buildFollowVerifyRequest,
  normalizeFollowVerificationResults,
  FOLLOW_VERIFY_REQUEST_KEY,
  FOLLOW_VERIFY_RESULTS_KEY,
} from '../utils/followRules';

export function useRaffleForm({ importedComments, onClearImported }) {
  const [rawText, setRawText] = useState('');
  const [comments, setComments] = useState([]);
  const [brand, setBrand] = useState({ name: '', logo: '', raffleName: '', postUrl: '' });
  const [prizes, setPrizes] = useState([
    { id: Date.now(), name: '', image: '', winnerCount: 1, substituteCount: 1 },
  ]);
  const [entryMethod, setEntryMethod] = useState('one_per_user');
  const [minMentions, setMinMentions] = useState(0);
  const [mentionMode, setMentionMode] = useState('per_comment');
  const [weightedEntry, setWeightedEntry] = useState(false);
  const [uniqueMentions, setUniqueMentions] = useState(false);
  const [keywordRequired, setKeywordRequired] = useState('');
  const [keywordBlacklist, setKeywordBlacklist] = useState('');
  const [userBlacklist, setUserBlacklist] = useState('');
  const [requiredFollowAccounts, setRequiredFollowAccounts] = useState('');
  const [minRequiredFollows, setMinRequiredFollows] = useState(1);
  const [followVerification, setFollowVerification] = useState({});
  const [followVerifyMessage, setFollowVerifyMessage] = useState('');
  const [followVerifyPending, setFollowVerifyPending] = useState(false);
  const [showPrizeProductsInResultsStory, setShowPrizeProductsInResultsStory] = useState(false);
  const [storyBackgroundId, setStoryBackgroundId] = useState(DEFAULT_STORY_BACKGROUND_ID);
  const [storageWarning, setStorageWarning] = useState('');
  const [configMessage, setConfigMessage] = useState('');
  const [generatingSetupStory, setGeneratingSetupStory] = useState(false);
  const [generatingStartingStory, setGeneratingStartingStory] = useState(false);

  const configFileInputRef = useRef(null);
  const parseDebounceRef = useRef(null);

  const followAccountList = useMemo(
    () => parseFollowAccountList(requiredFollowAccounts),
    [requiredFollowAccounts]
  );

  const followRuleActive = useMemo(
    () => isFollowRuleActive(requiredFollowAccounts, minRequiredFollows),
    [requiredFollowAccounts, minRequiredFollows]
  );

  const effectiveMinRequiredFollows = useMemo(
    () => getEffectiveMinRequiredFollows(followAccountList, minRequiredFollows),
    [followAccountList, minRequiredFollows]
  );

  const getConfigState = () => ({
    brand, prizes, entryMethod, minMentions, mentionMode, weightedEntry,
    uniqueMentions, keywordRequired, keywordBlacklist, userBlacklist,
    requiredFollowAccounts,
    minRequiredFollows: effectiveMinRequiredFollows,
    showPrizeProductsInResultsStory,
    storyBackgroundId,
  });

  const applyImportedConfig = (config) => {
    setBrand(config.brand);
    setPrizes(config.prizes);
    setEntryMethod(config.entryMethod);
    setMinMentions(config.minMentions);
    setMentionMode(config.mentionMode);
    setWeightedEntry(config.weightedEntry);
    setUniqueMentions(config.uniqueMentions);
    setKeywordRequired(config.keywordRequired);
    setKeywordBlacklist(config.keywordBlacklist);
    setUserBlacklist(config.userBlacklist);
    setRequiredFollowAccounts(config.requiredFollowAccounts || '');
    setMinRequiredFollows(config.minRequiredFollows ?? 1);
    setShowPrizeProductsInResultsStory(Boolean(config.showPrizeProductsInResultsStory));
    setStoryBackgroundId(config.storyBackgroundId || DEFAULT_STORY_BACKGROUND_ID);
  };

  useEffect(() => {
    loadSetupState().then((saved) => {
      if (!saved) return;
      if (saved.rawText) setRawText(saved.rawText);
      if (saved.comments) setComments(saved.comments);
      if (saved.brand) setBrand(saved.brand);
      if (saved.prizes) setPrizes(saved.prizes);
      if (saved.entryMethod) setEntryMethod(saved.entryMethod);
      if (saved.minMentions != null) setMinMentions(saved.minMentions);
      if (saved.mentionMode) setMentionMode(saved.mentionMode);
      if (saved.weightedEntry != null) setWeightedEntry(saved.weightedEntry);
      if (saved.uniqueMentions != null) setUniqueMentions(saved.uniqueMentions);
      if (saved.keywordRequired) setKeywordRequired(saved.keywordRequired);
      if (saved.keywordBlacklist) setKeywordBlacklist(saved.keywordBlacklist);
      if (saved.userBlacklist) setUserBlacklist(saved.userBlacklist);
      if (saved.requiredFollowAccounts) setRequiredFollowAccounts(saved.requiredFollowAccounts);
      if (saved.minRequiredFollows != null) setMinRequiredFollows(saved.minRequiredFollows);
      if (saved.followVerification) setFollowVerification(saved.followVerification);
      if (saved.showPrizeProductsInResultsStory != null) {
        setShowPrizeProductsInResultsStory(Boolean(saved.showPrizeProductsInResultsStory));
      }
      if (saved.storyBackgroundId) {
        setStoryBackgroundId(saved.storyBackgroundId);
      }
    });
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      saveSetupState({
        rawText, comments, brand, prizes,
        entryMethod, minMentions, mentionMode, weightedEntry,
        uniqueMentions, keywordRequired, keywordBlacklist, userBlacklist,
        requiredFollowAccounts,
        minRequiredFollows: effectiveMinRequiredFollows,
        followVerification,
        showPrizeProductsInResultsStory,
        storyBackgroundId,
      }).then((saved) => {
        setStorageWarning(saved ? '' : 'Tarayıcı depolama alanı dolu olabilir; ayarlar tam kaydedilemedi.');
      });
    }, 400);
    return () => window.clearTimeout(timeoutId);
  }, [rawText, comments, brand, prizes, entryMethod, minMentions, mentionMode, weightedEntry, uniqueMentions, keywordRequired, keywordBlacklist, userBlacklist, requiredFollowAccounts, effectiveMinRequiredFollows, followVerification, showPrizeProductsInResultsStory, storyBackgroundId]);

  useEffect(() => {
    const loadResults = () => {
      const raw = localStorage.getItem(FOLLOW_VERIFY_RESULTS_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        setFollowVerification(normalizeFollowVerificationResults(parsed));
        setFollowVerifyMessage('Takip doğrulama sonuçları yüklendi.');
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

    const participants = Array.from(new Set(comments.map((c) => c.username)));
    const request = buildFollowVerifyRequest(participants, requiredFollowAccounts, effectiveMinRequiredFollows);
    localStorage.setItem(FOLLOW_VERIFY_REQUEST_KEY, JSON.stringify(request));
  }, [comments, followRuleActive, requiredFollowAccounts, effectiveMinRequiredFollows]);

  useEffect(() => {
    if (importedComments?.length > 0) {
      setComments(importedComments);
      setRawText('');
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
    const participants = Array.from(new Set(comments.map((c) => c.username)));
    const request = buildFollowVerifyRequest(participants, requiredFollowAccounts, effectiveMinRequiredFollows);
    localStorage.setItem(FOLLOW_VERIFY_REQUEST_KEY, JSON.stringify(request));
    setFollowVerifyPending(true);
    setFollowVerifyMessage(`${participants.length} katılımcı için doğrulama hazır. Chrome eklentisini açıp "Takip Şartlarını Doğrula" butonuna basın. Instagram oturumunuz açık olmalıdır.`);
  };

  const handleImageUpload = (e, callback) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 800;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height / width) * maxSize);
            width = maxSize;
          } else {
            width = Math.round((width / height) * maxSize);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => callback(event.target.result);
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const addPrize = () => setPrizes([...prizes, { id: Date.now(), name: '', image: '', winnerCount: 1, substituteCount: 1 }]);
  const removePrize = (id) => { if (prizes.length > 1) setPrizes(prizes.filter((p) => p.id !== id)); };
  const updatePrize = (id, field, value) => setPrizes(prizes.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

  const handleTextChange = (e) => {
    const text = e.target.value;
    setRawText(text);
    if (parseDebounceRef.current) clearTimeout(parseDebounceRef.current);
    if (!text.trim()) { setComments([]); return; }
    parseDebounceRef.current = setTimeout(() => setComments(parseRawText(text)), 250);
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const parsed = parseCSV(event.target.result);
      if (parsed.length > 0) {
        setComments(parsed);
        setRawText('');
      } else {
        alert('CSV dosyası ayrıştırılamadı.');
      }
    };
    reader.readAsText(file);
  };

  const loadDemoData = () => {
    setComments(MOCK_COMMENTS_PRESET);
    setRawText('');
  };

  const clearData = () => {
    setRawText('');
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
      if (uniqueMentions) {
        validMentions = Array.from(new Set(validMentions.filter((m) => m !== username)));
      }
      if (minMentions > 0 && mentionMode === 'per_comment' && validMentions.length < minMentions) return;

      if (!userEntries[username]) {
        userEntries[username] = { username: comment.username, comments: [], allMentions: new Set() };
      }
      userEntries[username].comments.push({ text: comment.text, mentions: validMentions });
      validMentions.forEach((m) => userEntries[username].allMentions.add(m));
    });

    const tickets = [];
    Object.values(userEntries).forEach((userData) => {
      const totalUniqueMentions = userData.allMentions.size;
      if (minMentions > 0 && mentionMode === 'cumulative' && totalUniqueMentions < minMentions) return;
      if (!passesFollowRule(userData.username)) return;

      let ticketCount = 0;
      if (minMentions > 0 && weightedEntry) ticketCount = Math.floor(totalUniqueMentions / minMentions);
      else if (entryMethod === 'one_per_user') ticketCount = 1;
      else ticketCount = userData.comments.length;

      for (let i = 0; i < ticketCount; i += 1) {
        tickets.push({
          username: userData.username,
          comment: entryMethod === 'one_per_comment' && !weightedEntry
            ? userData.comments[i]?.text || userData.comments[0].text
            : userData.comments[0].text,
          ticketIndex: i + 1,
          totalTickets: ticketCount,
        });
      }
    });
    return tickets;
  }, [comments, entryMethod, minMentions, mentionMode, weightedEntry, uniqueMentions, keywordRequired, keywordBlacklist, userBlacklist, followRuleActive, followVerification]);

  const uniqueParticipantsCount = useMemo(
    () => new Set(ticketsPool.map((t) => t.username.toLowerCase())).size,
    [ticketsPool]
  );

  const participantStats = useMemo(() => {
    if (comments.length === 0) return [];

    const byUser = {};
    comments.forEach((comment) => {
      const key = comment.username.toLowerCase();
      if (!byUser[key]) {
        byUser[key] = { username: comment.username, commentCount: 0, ticketCount: 0 };
      }
      byUser[key].commentCount += 1;
    });

    ticketsPool.forEach((ticket) => {
      const key = ticket.username.toLowerCase();
      if (byUser[key]) {
        byUser[key].ticketCount = ticket.totalTickets;
      }
    });

    return Object.values(byUser).map((person) => ({
      ...person,
      followStatus: getFollowStatusForUser(person.username),
    })).sort(
      (a, b) => b.ticketCount - a.ticketCount
        || b.commentCount - a.commentCount
        || a.username.localeCompare(b.username, 'tr')
    );
  }, [comments, ticketsPool, followRuleActive, followVerification]);

  const filteredOutCount = useMemo(
    () => participantStats.filter((p) => p.ticketCount === 0).length,
    [participantStats]
  );

  const handleExportConfigTxt = () => {
    const slug = brand.raffleName?.toLowerCase().replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'cekilis';
    downloadConfigTxt(getConfigState(), `${slug}_ayarlari.txt`);
    setConfigMessage('Ayar dosyası indirildi.');
  };

  const handleImportConfigTxt = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        applyImportedConfig(parseConfigFromTxt(event.target.result));
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
    minRequiredFollows, setMinRequiredFollows,
    followAccountList, followRuleActive, effectiveMinRequiredFollows,
    followVerification, followVerifyMessage, followVerifyPending,
    handlePrepareFollowVerification, getFollowStatusForUser,
    showPrizeProductsInResultsStory, setShowPrizeProductsInResultsStory,
    storyBackgroundId, setStoryBackgroundId,
    rawText, comments, handleTextChange, handleCSVUpload, loadDemoData, clearData,
    handleImageUpload, ticketsPool, uniqueParticipantsCount, participantStats, filteredOutCount,
    storageWarning, configMessage,
    generatingSetupStory, generatingStartingStory,
    handleExportConfigTxt, handleImportConfigTxt,
    handleGenerateSetupStory, handleGenerateStartingStory,
    configFileInputRef, buildSetupConfig, validateStart,
  };
}
