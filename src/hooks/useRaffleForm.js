import { useState, useEffect, useRef } from 'react';
import { loadSetupState, saveSetupState } from '../utils/setupStorage';
import { downloadConfigTxt, parseConfigFromTxt } from '../utils/raffleConfigFile';
import { generateSetupStory } from '../utils/generateSetupStory';
import { generateStartingStory } from '../utils/generateStartingStory';
import { fetchPostMetadata } from '../utils/fetchPostMetadata';

import { useBrandForm } from './useBrandForm';
import { useParticipationRules } from './useParticipationRules';
import { useCommentImport } from './useCommentImport';
import { useFollowVerify } from './useFollowVerify';
import { useTicketPool } from './useTicketPool';
import { extractPostOwnerFromUrl } from '../utils/commentParsing';

export function useRaffleForm({ importedComments, importedLikers, importedReplies, onClearImported, activeRaffleId }) {
  const bf = useBrandForm();
  const r = useParticipationRules();
  const ci = useCommentImport({ importedComments, importedLikers, importedReplies, onClearImported });
  const fv = useFollowVerify({
    followRuleActive: r.followRuleActive,
    comments: ci.comments,
    requiredFollowAccounts: r.requiredFollowAccounts,
    requireFollowAccounts: r.requireFollowAccounts,
  });
  const postOwnerUsername = extractPostOwnerFromUrl(bf.brand.postUrl);

  const tp = useTicketPool({
    comments: ci.comments, likers: ci.likers,
    passesFollowRule: fv.passesFollowRule, getFollowStatusForUser: fv.getFollowStatusForUser,
    followRuleActive: r.followRuleActive, followVerification: fv.followVerification,
    entryMethod: r.entryMethod, requireMentionRule: r.requireMentionRule,
    minMentions: r.minMentions, maxMentions: r.maxMentions,
    maxCommentsPerUser: r.maxCommentsPerUser, mentionMode: r.mentionMode,
    weightedEntry: r.weightedEntry, uniqueMentions: r.uniqueMentions,
    keywordRequired: r.keywordRequired, keywordBlacklist: r.keywordBlacklist,
    userBlacklist: r.userBlacklist, requireLike: r.requireLike,
    participationCriteria: r.participationCriteria,
    effectiveMinRequiredFollows: r.effectiveMinRequiredFollows,
    requiredFollowAccounts: r.requiredFollowAccounts,
    postOwnerUsername,
  });

  const [storageWarning, setStorageWarning] = useState('');
  const [configMessage, setConfigMessage] = useState('');
  const [savingRaffle, setSavingRaffle] = useState(false);
  const [generatingSetupStory, setGeneratingSetupStory] = useState(false);
  const [generatingStartingStory, setGeneratingStartingStory] = useState(false);
  const [generatingWithAI, setGeneratingWithAI] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const configFileInputRef = useRef(null);

  const buildPersistState = () => ({
    comments: ci.comments,
    brand: bf.brand, prizes: bf.prizes,
    showPrizeProductsInResultsStory: bf.showPrizeProductsInResultsStory,
    storyBackgroundId: bf.storyBackgroundId,
    followVerification: fv.followVerification,
    ...r.getRulesSnapshot(),
  });

  const getConfigState = () => ({
    brand: bf.brand, prizes: bf.prizes,
    showPrizeProductsInResultsStory: bf.showPrizeProductsInResultsStory,
    storyBackgroundId: bf.storyBackgroundId,
    ...r.getRulesSnapshot(),
  });

  const buildSetupConfig = () => ({
    ticketsPool: tp.ticketsPool,
    brand: bf.brand, prizes: bf.prizes,
    rules: {
      ...r.getRulesSnapshot(),
      showPrizeProductsInResultsStory: bf.showPrizeProductsInResultsStory,
      storyBackgroundId: bf.storyBackgroundId,
      followVerification: fv.followVerification,
    },
  });

  const applySavedState = (saved) => {
    ci.applyComments(saved);
    bf.applyBrand(saved);
    r.applyRules(saved);
    fv.applyFollowVerify(saved);
  };

  const resetForm = () => {
    ci.resetComments();
    bf.resetBrand();
    r.resetRules();
    fv.resetFollowVerify();
    setConfigMessage('');
  };

  // Load saved state when raffle changes
  useEffect(() => {
    if (!activeRaffleId) return undefined;
    let cancelled = false;
    loadSetupState(activeRaffleId).then((saved) => {
      if (cancelled) return;
      if (!saved) { resetForm(); return; }
      applySavedState(saved);
      bf.recompressBrandImages(saved);
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRaffleId]);

  // Auto-save on state changes
  useEffect(() => {
    if (!activeRaffleId) return undefined;
    const id = window.setTimeout(() => {
      saveSetupState(buildPersistState(), activeRaffleId).then((ok) => {
        setStorageWarning(ok ? '' : 'Tarayıcı depolama alanı dolu olabilir; ayarlar tam kaydedilemedi.');
      });
    }, 400);
    return () => window.clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeRaffleId, ci.comments, bf.brand, bf.prizes,
    bf.showPrizeProductsInResultsStory, bf.storyBackgroundId,
    r.entryMethod, r.minMentions, r.mentionMode, r.weightedEntry,
    r.uniqueMentions, r.keywordRequired, r.keywordBlacklist, r.userBlacklist,
    r.requiredFollowAccounts, r.requireFollowAccounts, r.requireMentionRule,
    r.effectiveMinRequiredFollows, r.participationCriteria,
    fv.followVerification,
  ]);

  // Sync brand fields from Chrome extension post import
  useEffect(() => {
    const handler = (event) => {
      if (event.key !== 'raffle_post_import_result' || !event.newValue) return;
      try {
        const result = JSON.parse(event.newValue);
        if (!result?.ok) return;
        bf.setBrand((prev) => ({
          ...prev,
          postUrl: result.postUrl || prev.postUrl,
          name: result.brandName && !prev.name ? result.brandName : prev.name,
          postDescription: result.description || prev.postDescription,
        }));
      } catch { /* ignore malformed storage event */ }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveRaffle = async () => {
    if (!activeRaffleId) { setConfigMessage('Kaydetmek için önce bir çekiliş oluşturun.'); return false; }
    if (!bf.brand.raffleName?.trim()) { setConfigMessage('Çekiliş adını girdikten sonra kaydedebilirsiniz.'); return false; }
    setSavingRaffle(true);
    try {
      const ok = await saveSetupState(buildPersistState(), activeRaffleId);
      setStorageWarning(ok ? '' : 'Tarayıcı depolama alanı dolu olabilir; ayarlar tam kaydedilemedi.');
      setConfigMessage(ok ? 'Çekiliş kaydedildi.' : 'Kayıt tamamlanamadı; depolama alanını kontrol edin.');
      return ok;
    } finally { setSavingRaffle(false); }
  };

  const handleExportConfigTxt = () => {
    const slug = bf.brand.raffleName?.toLowerCase().replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'cekilis';
    downloadConfigTxt(getConfigState(), `${slug}_ayarlari.txt`);
    setConfigMessage('Ayar dosyası indirildi.');
  };

  const handleImportConfigTxt = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const config = parseConfigFromTxt(event.target.result);
        await bf.applyImportedBrand(config);
        r.applyImportedRules(config);
        setConfigMessage(`"${file.name}" dosyasından tanımlar yüklendi.`);
      } catch (err) { alert(err.message || 'Ayar dosyası okunamadı.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleGenerateSetupStory = async () => {
    setGeneratingSetupStory(true);
    try {
      await generateSetupStory(getConfigState());
      setConfigMessage('Ön duyuru story görseli indirildi.');
    } catch (err) { console.error(err); alert('Story görseli oluşturulurken bir hata oluştu.'); }
    finally { setGeneratingSetupStory(false); }
  };

  const handleGenerateStartingStory = async () => {
    setGeneratingStartingStory(true);
    try {
      await generateStartingStory(getConfigState(), {
        participantCount: tp.uniqueParticipantsCount,
        ticketCount: tp.ticketsPool.length,
        prizeCount: bf.prizes.length,
      });
      setConfigMessage('Çekiliş başlıyor story görseli indirildi.');
    } catch (err) { console.error(err); alert('Story görseli oluşturulurken bir hata oluştu.'); }
    finally { setGeneratingStartingStory(false); }
  };

  const getApiKey = () =>
    (localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '').trim();

  const geminiPost = async (apiKey, body) => {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error?.message || `HTTP ${resp.status}`); }
    return resp.json();
  };

  const handleGenerateWithAI = async () => {
    const apiKey = getApiKey();
    if (!apiKey) { setAiMessage('Önce API anahtarı girin (⚙ AI Ayarı)'); return; }
    setGeneratingWithAI(true); setAiMessage('');
    try {
      const ctxParts = [];
      if (bf.brand.name) ctxParts.push(`Marka: ${bf.brand.name}`);
      if (bf.brand.postDescription) ctxParts.push(`Gönderi: ${bf.brand.postDescription.slice(0, 400)}`);
      const ctx = ctxParts.length ? `\n\n${ctxParts.join('\n')}` : '';
      const data = await geminiPost(apiKey, {
        contents: [{ parts: [{ text: `Instagram çekilişi için kısa, akılda kalıcı Türkçe bir çekiliş adı oluştur.${ctx}\n\nSadece adı yaz, başka hiçbir şey ekleme.` }] }],
        generationConfig: { maxOutputTokens: 60, temperature: 0.8 },
      });
      const name = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (name) { bf.setBrand((prev) => ({ ...prev, raffleName: name })); setAiMessage('✓ Oluşturuldu'); }
    } catch (err) { setAiMessage(err.message || 'Hata oluştu'); }
    finally { setGeneratingWithAI(false); }
  };

  const handleParsePostWithAI = async () => {
    const apiKey = getApiKey();
    if (!apiKey) { setAiMessage('Önce API anahtarı girin (⚙ AI Ayarı)'); return; }
    if (!bf.brand.postUrl && !bf.brand.postDescription) { setAiMessage('Gönderi linki veya açıklama girilmemiş'); return; }
    setGeneratingWithAI(true); setAiMessage('Gönderi analiz ediliyor…');
    try {
      let description = bf.brand.postDescription;
      if (bf.brand.postUrl) {
        const result = await fetchPostMetadata(bf.brand.postUrl);
        if (result.ok && result.description) {
          description = result.description;
          bf.setBrand((prev) => ({ ...prev, postDescription: description, name: prev.name || result.brandName || prev.name }));
        } else if (!description) { setAiMessage(result.error || 'Post bilgileri alınamadı'); return; }
      }
      if (!description) { setAiMessage('Gönderi linki girilmemiş ya da açıklama bulunamadı'); return; }

      const prompt = `Aşağıdaki Instagram çekiliş gönderisi metnini analiz et ve JSON formatında bilgileri çıkar.\n\nGönderi metni:\n${description.slice(0, 1500)}\n\nAşağıdaki JSON yapısını doldur. Bilinmeyenler için null kullan. Tarihler YYYY-MM-DD, saatler HH:MM formatında:\n{\n  "raffleName": "çekilişin kısa adı",\n  "prizes": [{"name": "ödül adı", "winnerCount": 1, "substituteCount": 1}],\n  "requireComment": true,\n  "requireLike": false,\n  "requireSave": false,\n  "requireFollowAccounts": true,\n  "followAccounts": "@hesap1, @hesap2",\n  "requireMentionRule": false,\n  "minMentions": 1,\n  "keywordRequired": "",\n  "entryEndDate": null,\n  "drawDate": null,\n  "drawTime": null\n}\n\nSadece JSON döndür, başka açıklama ekleme.`;
      const data = await geminiPost(apiKey, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.2 },
      });
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!raw) throw new Error('Yanıt boş');

      const tryParse = (s) => { try { return JSON.parse(s); } catch { return null; } };
      let parsed = tryParse(raw);
      if (!parsed) { const m = raw.match(/```(?:json)?\s*([\s\S]+?)```/); if (m) parsed = tryParse(m[1].trim()); }
      if (!parsed) { const s = raw.indexOf('{'); const e = raw.lastIndexOf('}'); if (s !== -1 && e > s) parsed = tryParse(raw.slice(s, e + 1)); }
      if (!parsed) throw new Error('JSON parse hatası — Gemini yanıtı: ' + raw.slice(0, 120));

      bf.setBrand((prev) => ({
        ...prev,
        ...(parsed.raffleName ? { raffleName: parsed.raffleName } : {}),
        ...(parsed.entryEndDate ? { entryEndDate: parsed.entryEndDate } : {}),
        ...(parsed.drawDate ? { drawDate: parsed.drawDate } : {}),
        ...(parsed.drawTime ? { drawTime: parsed.drawTime } : {}),
      }));
      if (Array.isArray(parsed.prizes) && parsed.prizes.length > 0) {
        bf.setPrizes(parsed.prizes.map((p, i) => ({
          id: Date.now() + i, name: p.name || '', image: '',
          winnerCount: Math.max(1, parseInt(p.winnerCount, 10) || 1),
          substituteCount: Math.max(0, parseInt(p.substituteCount, 10) || 1),
        })));
      }
      if (parsed.requireComment != null) r.setRequireComment(Boolean(parsed.requireComment));
      if (parsed.requireLike != null) r.setRequireLike(Boolean(parsed.requireLike));
      if (parsed.requireSave != null) r.setRequireSave(Boolean(parsed.requireSave));
      if (parsed.requireFollowAccounts != null) r.setRequireFollowAccounts(Boolean(parsed.requireFollowAccounts));
      if (parsed.followAccounts) r.setRequiredFollowAccounts(parsed.followAccounts);
      if (parsed.requireMentionRule != null) r.setRequireMentionRule(Boolean(parsed.requireMentionRule));
      if (parsed.minMentions != null) r.setMinMentions(Math.max(0, parseInt(parsed.minMentions, 10) || 0));
      if (parsed.keywordRequired) r.setKeywordRequired(parsed.keywordRequired);
      setAiMessage('✓ Form dolduruldu');
    } catch (err) { setAiMessage(err.message || 'Hata oluştu'); }
    finally { setGeneratingWithAI(false); }
  };

  const validateStart = () => {
    if (tp.ticketsPool.length === 0) {
      alert('Çekiliş havuzunda geçerli katılımcı bulunamadı. Lütfen yorum ekleyin veya kuralları gevşetin.');
      return false;
    }
    if (bf.prizes.reduce((sum, p) => sum + parseInt(p.winnerCount || 0, 10), 0) < 1) {
      alert('Asil kazanan sayısı toplamda en az 1 olmalıdır.');
      return false;
    }
    return true;
  };

  return {
    // Brand
    brand: bf.brand, setBrand: bf.setBrand,
    prizes: bf.prizes, addPrize: bf.addPrize, removePrize: bf.removePrize, updatePrize: bf.updatePrize,
    showPrizeProductsInResultsStory: bf.showPrizeProductsInResultsStory,
    setShowPrizeProductsInResultsStory: bf.setShowPrizeProductsInResultsStory,
    storyBackgroundId: bf.storyBackgroundId, setStoryBackgroundId: bf.setStoryBackgroundId,
    handleImageUpload: bf.handleImageUpload,
    // Rules
    entryMethod: r.entryMethod, setEntryMethod: r.setEntryMethod,
    minMentions: r.minMentions, setMinMentions: r.setMinMentions,
    mentionMode: r.mentionMode, setMentionMode: r.setMentionMode,
    weightedEntry: r.weightedEntry, setWeightedEntry: r.setWeightedEntry,
    uniqueMentions: r.uniqueMentions, setUniqueMentions: r.setUniqueMentions,
    keywordRequired: r.keywordRequired, setKeywordRequired: r.setKeywordRequired,
    keywordBlacklist: r.keywordBlacklist, setKeywordBlacklist: r.setKeywordBlacklist,
    userBlacklist: r.userBlacklist, setUserBlacklist: r.setUserBlacklist,
    requiredFollowAccounts: r.requiredFollowAccounts, setRequiredFollowAccounts: r.setRequiredFollowAccounts,
    requireFollowAccounts: r.requireFollowAccounts, setRequireFollowAccounts: r.setRequireFollowAccounts,
    requireMentionRule: r.requireMentionRule, setRequireMentionRule: r.setRequireMentionRule,
    followAccountList: r.followAccountList, followRuleActive: r.followRuleActive,
    effectiveMinRequiredFollows: r.effectiveMinRequiredFollows,
    requireComment: r.requireComment, setRequireComment: r.setRequireComment,
    requireLike: r.requireLike, setRequireLike: r.setRequireLike,
    requireSave: r.requireSave, setRequireSave: r.setRequireSave,
    maxMentions: r.maxMentions, setMaxMentions: r.setMaxMentions,
    maxCommentsPerUser: r.maxCommentsPerUser, setMaxCommentsPerUser: r.setMaxCommentsPerUser,
    allowMultipleCommentsBonus: r.allowMultipleCommentsBonus, setAllowMultipleCommentsBonus: r.setAllowMultipleCommentsBonus,
    requireStoryShare: r.requireStoryShare, setRequireStoryShare: r.setRequireStoryShare,
    requireStoryProofIfPrivate: r.requireStoryProofIfPrivate, setRequireStoryProofIfPrivate: r.setRequireStoryProofIfPrivate,
    requireMinAge: r.requireMinAge, setRequireMinAge: r.setRequireMinAge,
    minAge: r.minAge, setMinAge: r.setMinAge,
    requireRealActiveAccount: r.requireRealActiveAccount, setRequireRealActiveAccount: r.setRequireRealActiveAccount,
    disallowBusinessAccounts: r.disallowBusinessAccounts, setDisallowBusinessAccounts: r.setDisallowBusinessAccounts,
    participationCriteria: r.participationCriteria, activeCriteriaColumns: r.activeCriteriaColumns,
    // Post owner (auto-excluded from raffle)
    postOwnerUsername,
    // Comments, likers & replies
    comments: ci.comments, clearData: ci.clearData,
    likers: ci.likers, likersCount: ci.likers.size,
    replies: ci.replies, replyCount: ci.replies.length,
    suspiciousMap: ci.suspiciousMap, botThreshold: ci.botThreshold, setBotThreshold: ci.setBotThreshold,
    postImportMessage: ci.postImportMessage, setPostImportMessage: ci.setPostImportMessage,
    // Follow verification (comment participants)
    followVerification: fv.followVerification,
    followVerifyMessage: fv.followVerifyMessage, followVerifyPending: fv.followVerifyPending,
    handlePrepareFollowVerification: fv.handlePrepareFollowVerification,
    getFollowStatusForUser: fv.getFollowStatusForUser,
    // Follow verification (likers)
    likerFollowVerification: fv.likerFollowVerification,
    likerFollowVerifyMessage: fv.likerFollowVerifyMessage, likerFollowVerifyPending: fv.likerFollowVerifyPending,
    passesLikerFollowRule: fv.passesLikerFollowRule, getLikerFollowStatus: fv.getLikerFollowStatus,
    handlePrepareLikerFollowVerification: fv.handlePrepareLikerFollowVerification,
    // Ticket pool
    ticketsPool: tp.ticketsPool,
    uniqueParticipantsCount: tp.uniqueParticipantsCount,
    participantStats: tp.participantStats,
    filteredOutCount: tp.filteredOutCount,
    // Orchestrator
    storageWarning, configMessage, savingRaffle,
    generatingSetupStory, generatingStartingStory,
    handleSaveRaffle, handleExportConfigTxt, handleImportConfigTxt,
    handleGenerateSetupStory, handleGenerateStartingStory,
    configFileInputRef, buildSetupConfig, validateStart, resetForm,
    generatingWithAI, aiMessage, setAiMessage, handleGenerateWithAI, handleParsePostWithAI,
  };
}
