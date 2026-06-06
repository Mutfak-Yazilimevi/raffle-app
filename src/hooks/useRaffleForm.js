import { useState, useEffect, useMemo, useRef } from 'react';
import { loadSetupState, saveSetupState } from '../utils/setupStorage';
import { downloadConfigTxt, parseConfigFromTxt } from '../utils/raffleConfigFile';
import { generateSetupStory } from '../utils/generateSetupStory';
import { generateStartingStory } from '../utils/generateStartingStory';
import { MOCK_COMMENTS_PRESET, parseRawText, parseCSV } from '../utils/commentParsing';

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
  const [storageWarning, setStorageWarning] = useState('');
  const [configMessage, setConfigMessage] = useState('');
  const [generatingSetupStory, setGeneratingSetupStory] = useState(false);
  const [generatingStartingStory, setGeneratingStartingStory] = useState(false);

  const configFileInputRef = useRef(null);
  const parseDebounceRef = useRef(null);

  const getConfigState = () => ({
    brand, prizes, entryMethod, minMentions, mentionMode, weightedEntry,
    uniqueMentions, keywordRequired, keywordBlacklist, userBlacklist,
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
    });
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      saveSetupState({
        rawText, comments, brand, prizes,
        entryMethod, minMentions, mentionMode, weightedEntry,
        uniqueMentions, keywordRequired, keywordBlacklist, userBlacklist,
      }).then((saved) => {
        setStorageWarning(saved ? '' : 'Tarayıcı depolama alanı dolu olabilir; ayarlar tam kaydedilemedi.');
      });
    }, 400);
    return () => window.clearTimeout(timeoutId);
  }, [rawText, comments, brand, prizes, entryMethod, minMentions, mentionMode, weightedEntry, uniqueMentions, keywordRequired, keywordBlacklist, userBlacklist]);

  useEffect(() => {
    if (importedComments?.length > 0) {
      setComments(importedComments);
      setRawText(`${importedComments.length} yorum eklentiden yüklendi. (Liste performans için gizlendi)`);
    }
  }, [importedComments]);

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
        setRawText(`${parsed.length} yorum dosyadan yüklendi.`);
      } else {
        alert('CSV dosyası ayrıştırılamadı.');
      }
    };
    reader.readAsText(file);
  };

  const loadDemoData = () => {
    setComments(MOCK_COMMENTS_PRESET);
    setRawText(`${MOCK_COMMENTS_PRESET.length} demo yorum yüklendi.`);
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
  }, [comments, entryMethod, minMentions, mentionMode, weightedEntry, uniqueMentions, keywordRequired, keywordBlacklist, userBlacklist]);

  const uniqueParticipantsCount = useMemo(
    () => new Set(ticketsPool.map((t) => t.username.toLowerCase())).size,
    [ticketsPool]
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
    rawText, comments, handleTextChange, handleCSVUpload, loadDemoData, clearData,
    handleImageUpload, ticketsPool, uniqueParticipantsCount,
    storageWarning, configMessage,
    generatingSetupStory, generatingStartingStory,
    handleExportConfigTxt, handleImportConfigTxt,
    handleGenerateSetupStory, handleGenerateStartingStory,
    configFileInputRef, buildSetupConfig, validateStart,
  };
}
