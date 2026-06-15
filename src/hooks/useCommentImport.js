import { useState, useMemo, useEffect } from 'react';
import { normalizeImportedComments } from '../utils/commentParsing';
import { flagSuspiciousParticipants, BOT_THRESHOLDS } from '../utils/botDetection';

export function useCommentImport({ importedComments, importedLikers, importedReplies, onClearImported }) {
  const [comments, setComments] = useState([]);
  const [likers, setLikers] = useState(new Set());
  const [replies, setReplies] = useState([]);
  const [botThreshold, setBotThreshold] = useState(BOT_THRESHOLDS.medium);
  const [postImportMessage, setPostImportMessage] = useState('');

  useEffect(() => {
    if (importedComments?.length > 0) {
      setComments(normalizeImportedComments(importedComments));
    }
  }, [importedComments]);

  useEffect(() => {
    if (importedLikers?.length > 0) {
      setLikers(new Set(importedLikers.map((u) => String(u).toLowerCase())));
    } else {
      setLikers(new Set());
    }
  }, [importedLikers]);

  useEffect(() => {
    if (importedReplies?.length > 0) {
      setReplies(importedReplies);
    } else {
      setReplies([]);
    }
  }, [importedReplies]);

  useEffect(() => {
    const onPostImport = async (event) => {
      if (event.key !== 'raffle_post_import_result' || !event.newValue) return;
      try {
        const result = JSON.parse(event.newValue);
        if (!result?.ok) return;
        setPostImportMessage(
          result.brandName
            ? `Post bilgileri dolduruldu — @${result.brandName}`
            : 'Post bilgileri dolduruldu.',
        );
        localStorage.removeItem('raffle_post_import_result');
      } catch (err) {
        console.error('Post import result okunamadı:', err);
      }
    };
    window.addEventListener('storage', onPostImport);
    return () => window.removeEventListener('storage', onPostImport);
  }, []);

  const suspiciousMap = useMemo(
    () => flagSuspiciousParticipants(comments, botThreshold),
    [comments, botThreshold]
  );

  const clearData = () => {
    setComments([]);
    if (onClearImported) onClearImported();
  };

  function applyComments(saved) {
    setComments(saved.comments ?? []);
  }

  function resetComments() {
    setComments([]);
  }

  return {
    comments, setComments,
    likers, setLikers,
    replies, setReplies,
    botThreshold, setBotThreshold,
    postImportMessage, setPostImportMessage,
    suspiciousMap,
    clearData,
    applyComments, resetComments,
  };
}
