import { useState, useEffect } from 'react';
import {
  buildFollowVerifyRequest,
  normalizeFollowVerificationResults,
  FOLLOW_VERIFY_REQUEST_KEY,
  FOLLOW_VERIFY_RESULTS_KEY,
  LIKE_FOLLOW_VERIFY_REQUEST_KEY,
  LIKE_FOLLOW_VERIFY_RESULTS_KEY,
} from '../utils/followRules';
import { getUniqueParticipantUsernames } from '../utils/commentParsing';

export function useFollowVerify({ followRuleActive, comments, requiredFollowAccounts, requireFollowAccounts }) {
  const [followVerification, setFollowVerification] = useState({});
  const [followVerifyMessage, setFollowVerifyMessage] = useState('');
  const [followVerifyPending, setFollowVerifyPending] = useState(false);

  const [likerFollowVerification, setLikerFollowVerification] = useState({});
  const [likerFollowVerifyMessage, setLikerFollowVerifyMessage] = useState('');
  const [likerFollowVerifyPending, setLikerFollowVerifyPending] = useState(false);

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
    const loadLikerResults = () => {
      const raw = localStorage.getItem(LIKE_FOLLOW_VERIFY_RESULTS_KEY);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        setLikerFollowVerification(normalizeFollowVerificationResults(parsed));
        setLikerFollowVerifyMessage(
          parsed.summary
            ? `Beğeni doğrulama tamamlandı: ${parsed.summary.passed}/${parsed.summary.total} beğeni takip şartını sağlıyor.`
            : 'Beğeni takip doğrulama sonuçları yüklendi.',
        );
        setLikerFollowVerifyPending(false);
        localStorage.removeItem(LIKE_FOLLOW_VERIFY_REQUEST_KEY);
      } catch (err) {
        console.error('Beğeni takip doğrulama sonuçları okunamadı:', err);
      }
    };
    loadLikerResults();
    const onStorage = (event) => {
      if (event.key === LIKE_FOLLOW_VERIFY_RESULTS_KEY) loadLikerResults();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const passesFollowRule = (username) => {
    if (!followRuleActive) return true;
    const verification = followVerification[username.toLowerCase()];
    if (!verification) return Object.keys(followVerification).length === 0;
    if (!verification.verified) return false;
    return verification.meetsRequirement !== false;
  };

  const getFollowStatusForUser = (username) => {
    if (!followRuleActive) return { status: 'na', label: '—' };
    const verification = followVerification[username.toLowerCase()];
    if (!verification?.verified) return { status: 'pending', label: 'Doğrulanmadı' };
    if (verification.meetsRequirement) return { status: 'passed', label: 'Takip ediyor' };
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
    setFollowVerifyMessage(
      `${participants.length} benzersiz katılımcı için doğrulama hazır.${bulkHint} Chrome eklentisini açıp "Takip Şartlarını Doğrula" butonuna basın. Zorunlu hesaplardan birine giriş yapmış olmalısınız.`
    );
  };

  const handlePrepareLikerFollowVerification = (likers) => {
    if (!followRuleActive) {
      alert('Önce takip edilmesi gereken hesapları tanımlayın.');
      return;
    }
    if (!likers || likers.size === 0) {
      alert('Doğrulama için önce beğeni listesini yükleyin.');
      return;
    }
    const participants = Array.from(likers);
    const request = buildFollowVerifyRequest(participants, requiredFollowAccounts, requireFollowAccounts);
    localStorage.setItem(LIKE_FOLLOW_VERIFY_REQUEST_KEY, JSON.stringify(request));
    setLikerFollowVerifyPending(true);
    const bulkHint = participants.length >= 60
      ? ' Büyük liste modu: zorunlu hesap takipçi listesi taranacak.'
      : '';
    setLikerFollowVerifyMessage(
      `${participants.length} beğeni için doğrulama hazır.${bulkHint} Chrome eklentisini açıp "Beğenenlerin Takibini Doğrula" butonuna basın.`
    );
  };

  const passesLikerFollowRule = (username) => {
    if (!followRuleActive) return true;
    const verification = likerFollowVerification[username.toLowerCase()];
    if (!verification) return Object.keys(likerFollowVerification).length === 0;
    if (!verification.verified) return false;
    return verification.meetsRequirement !== false;
  };

  const getLikerFollowStatus = (username) => {
    if (!followRuleActive) return { status: 'na', label: '—' };
    const verification = likerFollowVerification[username.toLowerCase()];
    if (!verification?.verified) return { status: 'pending', label: 'Doğrulanmadı' };
    if (verification.meetsRequirement) return { status: 'passed', label: 'Takip ediyor' };
    return { status: 'failed', label: 'Takip eksik', verification };
  };

  function applyFollowVerify(saved) {
    setFollowVerification(saved.followVerification ?? {});
    setFollowVerifyMessage('');
    setFollowVerifyPending(false);
  }

  function resetFollowVerify() {
    setFollowVerification({});
    setFollowVerifyMessage('');
    setFollowVerifyPending(false);
    setLikerFollowVerification({});
    setLikerFollowVerifyMessage('');
    setLikerFollowVerifyPending(false);
  }

  return {
    followVerification, setFollowVerification,
    followVerifyMessage, setFollowVerifyMessage,
    followVerifyPending, setFollowVerifyPending,
    passesFollowRule, getFollowStatusForUser,
    handlePrepareFollowVerification,
    likerFollowVerification,
    likerFollowVerifyMessage, setLikerFollowVerifyMessage,
    likerFollowVerifyPending,
    passesLikerFollowRule, getLikerFollowStatus,
    handlePrepareLikerFollowVerification,
    applyFollowVerify, resetFollowVerify,
  };
}
