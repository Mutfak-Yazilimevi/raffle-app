import React, { useState, useEffect } from 'react';
import { Settings, Upload, Users, ListFilter, Play, Info, Trash2, CheckCircle, Award, Image as ImageIcon, Puzzle, Download, ExternalLink } from 'lucide-react';
import { LINKS } from '../config';
import { downloadChromeExtension } from '../utils/downloadExtension';
import { loadSetupState, saveSetupState } from '../utils/setupStorage';

const MOCK_COMMENTS_PRESET = [
  { username: 'ahmet_yılmaz', text: 'Harika bir çekiliş! Katılıyorum @merve_kaya @can_demir @elif_sahin' },
  { username: 'merve_kaya', text: 'Umarım bana çıkar #cekilis @ahmet_yılmaz @can_demir' },
  { username: 'can_demir', text: 'Katıldım, herkese bol şans @elif_sahin' },
  { username: 'elif_sahin', text: 'Katılıyorum! #cekilis @ahmet_yılmaz @merve_kaya @can_demir' },
  { username: 'burak_avci', text: 'Bol şans dilerim @selin_ozdemir @kemal_aslan @deniz_aksoy' },
  { username: 'selin_ozdemir', text: 'Harika hediye! @burak_avci @kemal_aslan @deniz_aksoy' },
  { username: 'kemal_aslan', text: 'Katılıyorum @burak_avci @selin_ozdemir' },
  { username: 'deniz_aksoy', text: '#cekilis süper hediye @burak_avci @selin_ozdemir @kemal_aslan' },
  { username: 'fatma_celik', text: 'Katıldım @murat_kara @buse_tekin' },
  { username: 'murat_kara', text: 'Katılıyorum @fatma_celik' },
  { username: 'buse_tekin', text: 'Bol şans! @fatma_celik @murat_kara @gokhan_yilmaz' },
  { username: 'gokhan_yilmaz', text: 'İnşallah bana gelir @buse_tekin @zeynep_durmaz' },
  { username: 'zeynep_durmaz', text: '#cekilis katıldım @gokhan_yilmaz' },
  { username: 'oguzhan_unal', text: 'Katılıyorum @gamze_sari @ahmet_yılmaz' },
  { username: 'gamze_sari', text: 'Katıldım @oguzhan_unal' },
  // Aynı kişilerin birden fazla yorum yaptığı durumlar (test için)
  { username: 'ahmet_yılmaz', text: 'Tekrar yorum atıyorum bol şans @merve_kaya @elif_sahin @burak_avci' },
  { username: 'can_demir', text: 'Şansımızı artıralım @elif_sahin @ahmet_yılmaz' },
  { username: 'can_demir', text: 'Son yorumum @merve_kaya' },
  { username: 'zeynep_durmaz', text: 'Harika @gokhan_yilmaz @can_demir @merve_kaya' }
];

export default function RaffleSetup({ onSetupComplete, importedComments, onClearImported }) {
  const [rawText, setRawText] = useState('');
  const [comments, setComments] = useState([]);
  const [brand, setBrand] = useState({ name: '', logo: '', raffleName: '' });
  const [prizes, setPrizes] = useState([
    { id: Date.now(), name: '', image: '', winnerCount: 1, substituteCount: 1 }
  ]);
  const [entryMethod, setEntryMethod] = useState('one_per_user');
  const [minMentions, setMinMentions] = useState(0);
  const [mentionMode, setMentionMode] = useState('per_comment');
  const [weightedEntry, setWeightedEntry] = useState(false);
  const [uniqueMentions, setUniqueMentions] = useState(false);
  const [keywordRequired, setKeywordRequired] = useState('');
  const [keywordBlacklist, setKeywordBlacklist] = useState('');
  const [userBlacklist, setUserBlacklist] = useState('');
  const [extensionDownloading, setExtensionDownloading] = useState(false);
  const [storageWarning, setStorageWarning] = useState('');

  const handleExtensionDownload = async () => {
    setExtensionDownloading(true);
    try {
      const result = await downloadChromeExtension();
      if (!result.ok) {
        alert(
          'Eklenti dosyası şu an indirilemedi. Lütfen GitHub kurulum rehberinden manuel indirmeyi deneyin veya sayfayı yenileyip tekrar deneyin.'
        );
        window.open(LINKS.extensionGuide, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setExtensionDownloading(false);
    }
  };

  // Local storage'dan kayitli veriyi yukle
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

  // Form degisikliklerini kaydet (resimler IndexedDB'de, metin localStorage'da)
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

  const addPrize = () => {
    setPrizes([...prizes, { id: Date.now(), name: '', image: '', winnerCount: 1, substituteCount: 1 }]);
  };

  const removePrize = (id) => {
    if (prizes.length === 1) return;
    setPrizes(prizes.filter(p => p.id !== id));
  };

  const updatePrize = (id, field, value) => {
    setPrizes(prizes.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  // Eklentiden gelen veriyi yükle
  useEffect(() => {
    if (importedComments && importedComments.length > 0) {
      setComments(importedComments);
      // Düz metin alanına da görsel olarak yazalım
      const text = importedComments.map(c => `${c.username}\n${c.text}`).join('\n\n');
      setRawText(text);
    }
  }, [importedComments]);

  // Manuel yapıştırılan veriyi ayrıştır
  const handleTextChange = (e) => {
    const text = e.target.value;
    setRawText(text);
    if (!text.trim()) {
      setComments([]);
      return;
    }
    
    // Satır satır ayrıştırma
    const parsed = parseRawText(text);
    setComments(parsed);
  };

  const parseRawText = (text) => {
    const lines = text.split('\n');
    const parsedComments = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Instagram arayüz çöplerini atla
      if (
        line.match(/^\d+[gsqd]$/) ||
        line.match(/^\d+\s*(gün|saat|dakika|hafta|g|s|d|h|yıl)/i) ||
        line.match(/^(Yanıtla|Reply|Beğen|Like|Diğer yanıtları gör|View replies)/i) ||
        line.startsWith('Beğenildi')
      ) {
        continue;
      }
      
      // Instagram kullanıcı adı formatı: [a-zA-Z0-9._]{1,30}
      // Satırda sadece kullanıcı adı varsa ve sonraki satırlarda yorum varsa
      const usernameMatch = line.match(/^[a-zA-Z0-9._]{1,30}$/);
      
      if (usernameMatch) {
        let commentText = "";
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j].trim();
          if (!nextLine) {
            j++;
            continue;
          }
          if (
            nextLine.match(/^\d+[gsqd]$/) ||
            nextLine.match(/^\d+\s*(gün|saat|dakika|hafta|g|s|d|h|yıl)/i) ||
            nextLine.match(/^(Yanıtla|Reply|Beğen|Like|Diğer yanıtları gör|View replies)/i)
          ) {
            j++;
            continue;
          }
          
          // Eğer sonraki satır da kullanıcı adı gibi görünüyorsa, yorumsuz bir kullanıcı geçmiş olabiliriz.
          const nextUserMatch = nextLine.match(/^[a-zA-Z0-9._]{1,30}$/);
          if (nextUserMatch && j === i + 1) {
            // Yorum boş geçildi, bu satırı kullanıcı olarak alma, devam et.
            break;
          }
          
          commentText = nextLine;
          break;
        }
        
        if (commentText) {
          parsedComments.push({
            username: line,
            text: commentText
          });
          i = j; // Skiple
        }
      } else {
        // "kullanici_adi: yorum" şeklinde ayrıştırmayı dene
        const colonMatch = line.match(/^([a-zA-Z0-9._]{1,30}):\s*(.*)$/);
        if (colonMatch) {
          parsedComments.push({
            username: colonMatch[1],
            text: colonMatch[2]
          });
        } else {
          // "kullanici_adi yorum" formatını dene
          const spaceMatch = line.match(/^([a-zA-Z0-9._]{1,30})\s+(.*)$/);
          if (spaceMatch) {
            parsedComments.push({
              username: spaceMatch[1],
              text: spaceMatch[2]
            });
          }
        }
      }
    }
    return parsedComments;
  };

  // CSV dosyasını okuma
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const parsed = parseCSV(text);
      if (parsed.length > 0) {
        setComments(parsed);
        const formattedText = parsed.map(c => `${c.username}\n${c.text}`).join('\n\n');
        setRawText(formattedText);
      } else {
        alert('CSV dosyası ayrıştırılamadı. Lütfen uygun sütunları (username, comment) içerdiğinden emin olun.');
      }
    };
    reader.readAsText(file);
  };

  const parseCSV = (csvText) => {
    const lines = csvText.split('\n');
    if (lines.length < 2) return [];
    
    // Ayırıcıyı tespit et (virgül veya noktalı virgül)
    const header = lines[0];
    let sep = ',';
    if (header.includes(';')) sep = ';';
    else if (header.includes('\t')) sep = '\t';
    
    const headers = header.split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    
    // Sütun indekslerini bul
    const userIdx = headers.findIndex(h => h.includes('user') || h.includes('kullan') || h.includes('name') || h.includes('ad'));
    const commentIdx = headers.findIndex(h => h.includes('comment') || h.includes('yorum') || h.includes('text') || h.includes('mesaj'));
    
    if (userIdx === -1 || commentIdx === -1) {
      // Eğer başlık bulunamadıysa ilk iki sütunu kabul et
      return lines.slice(1).map(line => {
        const cols = line.split(sep).map(c => c.trim().replace(/['"]/g, ''));
        if (cols.length >= 2) {
          return { username: cols[0], text: cols[1] };
        }
        return null;
      }).filter(Boolean);
    }
    
    return lines.slice(1).map(line => {
      const cols = line.split(sep).map(c => c.trim().replace(/['"]/g, ''));
      if (cols.length > Math.max(userIdx, commentIdx)) {
        return {
          username: cols[userIdx].replace('@', ''),
          text: cols[commentIdx]
        };
      }
      return null;
    }).filter(Boolean);
  };

  // Demo verileri yükleme
  const loadDemoData = () => {
    setComments(MOCK_COMMENTS_PRESET);
    const text = MOCK_COMMENTS_PRESET.map(c => `${c.username}\n${c.text}`).join('\n\n');
    setRawText(text);
  };

  // Tüm veriyi temizleme
  const clearData = () => {
    setRawText('');
    setComments([]);
    if (onClearImported) onClearImported();
  };

  // Filtreleme Algoritması (Gerçek zamanlı bilet havuzu hesabı)
  const getFilteredTickets = () => {
    if (comments.length === 0) return [];
    
    // 1. Kara listedeki kelimeleri ve kullanıcıları belirle
    const blacklistedUsers = userBlacklist.split(',')
      .map(u => u.trim().toLowerCase().replace('@', ''))
      .filter(Boolean);
      
    const blacklistedKeywords = keywordBlacklist.split(',')
      .map(k => k.trim().toLowerCase())
      .filter(Boolean);

    const reqKeyword = keywordRequired.trim().toLowerCase();

    // 2. Yorumları analiz et ve kullanıcı bazlı grupla
    const userEntries = {};

    comments.forEach(comment => {
      const username = comment.username.toLowerCase();
      
      // Kullanıcı kara listede mi?
      if (blacklistedUsers.includes(username)) return;

      const text = comment.text;
      const textLower = text.toLowerCase();

      // Zorunlu kelime kontrolü
      if (reqKeyword && !textLower.includes(reqKeyword)) return;

      // Engellenen kelime kontrolü
      if (blacklistedKeywords.some(keyword => textLower.includes(keyword))) return;

      // Yorumdaki etiketleri ayıkla (@kullanici)
      // Instagram kullanıcı adları harf, rakam, alt çizgi ve nokta içerebilir
      const mentions = (text.match(/@[a-zA-Z0-9._]+/g) || [])
        .map(m => m.replace('@', '').toLowerCase());

      // Etiket filtreleri uygulandıktan sonraki geçerli etiketler
      let validMentions = [...mentions];
      
      if (uniqueMentions) {
        // Kendini etiketlemeyi engelle
        validMentions = validMentions.filter(m => m !== username);
        // Mükerrer etiketlemeyi engelle
        validMentions = Array.from(new Set(validMentions));
      }

      // Yorum başına etiket şartı kontrolü
      if (minMentions > 0 && mentionMode === 'per_comment') {
        if (validMentions.length < minMentions) return;
      }

      if (!userEntries[username]) {
        userEntries[username] = {
          username: comment.username, // orjinal case
          comments: [],
          allMentions: new Set()
        };
      }

      userEntries[username].comments.push({
        text: text,
        mentions: validMentions
      });

      validMentions.forEach(m => userEntries[username].allMentions.add(m));
    });

    // 3. Biletleri (Çekiliş Haklarını) Hesapla
    const tickets = [];

    Object.keys(userEntries).forEach(userKey => {
      const userData = userEntries[userKey];
      const totalUniqueMentions = userData.allMentions.size;

      // Toplam (kümülatif) etiket şartı kontrolü
      if (minMentions > 0 && mentionMode === 'cumulative') {
        if (totalUniqueMentions < minMentions) return;
      }

      let ticketCount = 0;

      if (minMentions > 0 && weightedEntry) {
        // Ağırlıklı Hak: Toplam benzersiz etiket sayısı / N
        ticketCount = Math.floor(totalUniqueMentions / minMentions);
      } else {
        // Standart Hak
        if (entryMethod === 'one_per_user') {
          ticketCount = 1;
        } else {
          // Her yorum bir hak
          ticketCount = userData.comments.length;
        }
      }

      for (let i = 0; i < ticketCount; i++) {
        tickets.push({
          username: userData.username,
          // Biletin hangi yorumla kazanıldığını göster (Ağırlıklı veya kümülatifte ilk yorumu, diğerinde ilgili yorumu ata)
          comment: entryMethod === 'one_per_comment' && !weightedEntry
            ? userData.comments[i]?.text || userData.comments[0].text
            : userData.comments[0].text,
          ticketIndex: i + 1,
          totalTickets: ticketCount
        });
      }
    });

    return tickets;
  };

  const ticketsPool = getFilteredTickets();
  // Benzersiz katılımcı sayısı
  const uniqueParticipantsCount = Array.from(new Set(ticketsPool.map(t => t.username.toLowerCase()))).length;

  const handleStartRaffle = () => {
    if (ticketsPool.length === 0) {
      alert('Çekiliş havuzunda geçerli katılımcı bulunamadı. Lütfen yorum ekleyin veya kuralları gevşetin.');
      return;
    }
    const totalWinners = prizes.reduce((sum, p) => sum + parseInt(p.winnerCount || 0), 0);
    if (totalWinners < 1) {
      alert('Asil kazanan sayısı toplamda en az 1 olmalıdır.');
      return;
    }
    
    onSetupComplete({
      ticketsPool,
      brand,
      prizes,
      rules: {
        entryMethod,
        minMentions,
        mentionMode,
        weightedEntry,
        uniqueMentions,
        keywordRequired,
        keywordBlacklist,
        userBlacklist
      }
    });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      
      {/* Depolama uyarısı */}
      {storageWarning && (
        <div className="glass-container" style={{ padding: '12px 16px', background: 'rgba(251, 173, 80, 0.1)', borderColor: 'rgba(251, 173, 80, 0.3)', borderRadius: '12px', fontSize: '13px', color: 'var(--insta-orange)' }}>
          {storageWarning}
        </div>
      )}

      {/* Chrome Eklentisi Kurulum Rehberi */}
      {(!importedComments || importedComments.length === 0) && comments.length === 0 && (
        <div className="glass-container" style={{ padding: '20px 24px', background: 'rgba(64, 93, 230, 0.08)', borderColor: 'rgba(64, 93, 230, 0.25)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div style={{ background: 'var(--insta-gradient)', padding: '10px', borderRadius: '12px', flexShrink: 0 }}>
                <Puzzle size={22} color="white" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: 'var(--insta-blue)' }}>
                  Instagram yorumlarını otomatik aktarın
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Yorumları elle kopyalamak yerine Chrome eklentimizi kullanın. Önce eklentiyi indirip kurun,
                  ardından Instagram&apos;da çekiliş gönderinizi açın — yorumları eklenti üzerinden çekip buraya aktarırız.
                </p>
              </div>
            </div>

            <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.8 }}>
              <li>
                <strong>Chrome eklentisini indirin ve kurun</strong> — ZIP dosyasını indirin, arşivi açın.
                Chrome&apos;da <code style={{ fontSize: '12px', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>chrome://extensions</code> adresine gidin,
                <em> Geliştirici modu</em>nu açın ve <em>Paketlenmemiş öğe yükle</em> ile açtığınız klasörü seçin.
              </li>
              <li>
                <strong>Instagram&apos;da çekiliş gönderinizi açın</strong> — yorumların olduğu gönderi veya reel sayfasına gidin.
              </li>
              <li>
                <strong>Eklenti ikonuna tıklayın</strong> — yorumları çekin ve <em>Çekiliş Uygulamasına Aktar</em> butonuna basın; veriler buraya otomatik gelir.
              </li>
            </ol>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '10px 18px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                onClick={handleExtensionDownload}
                disabled={extensionDownloading}
              >
                <Download size={16} /> {extensionDownloading ? 'İndiriliyor...' : 'Chrome Eklentisini İndir'}
              </button>
              <a
                href={LINKS.extensionGuide}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ padding: '10px 18px', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <ExternalLink size={16} /> Kurulum Rehberi (GitHub)
              </a>
              <a
                href={LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ padding: '10px 18px', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', borderColor: 'rgba(225, 48, 108, 0.3)' }}
              >
                Instagram&apos;ı Aç
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Üst Bilgilendirme */}
      {importedComments && importedComments.length > 0 && (
        <div className="glass-container" style={{ padding: '16px 20px', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle color="#10b981" size={24} />
            <div>
              <h4 style={{ margin: 0, color: '#10b981', fontWeight: 700 }}>Eklentiden Yorumlar Aktarıldı!</h4>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Instagram eklentiniz üzerinden {importedComments.length} yorum başarıyla yüklendi.</p>
            </div>
          </div>
          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={clearData}>Temizle</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* YORUM GİRİŞ ALANI */}
        <div className="glass-container" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users className="gradient-text" /> 1. Yorumları Yükle
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={loadDemoData}>Demo Yükle</button>
              {comments.length > 0 && (
                <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={clearData}>
                  <Trash2 size={14} /> Temizle
                </button>
              )}
            </div>
          </div>

          <div className="form-group" style={{ flexGrow: 1 }}>
            <textarea
              className="form-textarea"
              style={{ flexGrow: 1, minHeight: '300px', fontSize: '13px', lineHeight: '1.6' }}
              placeholder={`Örnek Format 1 (Instagram kopyala-yapıştır):\nkullanici_adi\nHarika çekiliş! @arkadas1 @arkadas2\n2g Yanıtla\n\nÖrnek Format 2 (Excel / CSV satırı):\nkullanici_adi: Katılıyorum @arkadas`}
              value={rawText}
              onChange={handleTextChange}
            />
          </div>

          {/* Dosya Yükleme */}
          <div style={{ border: '2px dashed var(--glass-border)', borderRadius: '12px', padding: '16px', textAlign: 'center', cursor: 'pointer', position: 'relative', background: 'rgba(0,0,0,0.2)' }}>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleCSVUpload}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
            />
            <Upload size={20} style={{ margin: '0 auto 8px', color: 'var(--insta-pink)' }} />
            <p style={{ fontSize: '13px', margin: 0, fontWeight: 500 }}>CSV veya TXT Dosyası Sürükleyin veya Seçin</p>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sütunlar: username, comment formatında olmalıdır</span>
          </div>
        </div>

        {/* ÇEKİLİŞ AYARLARI PANELDİ */}
        <div className="glass-container" style={{ padding: '24px' }}>
          
          {/* MARKA VE ÇEKİLİŞ BİLGİLERİ */}
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Settings className="gradient-text" /> 2. Marka ve Çekiliş Bilgileri (Opsiyonel)
          </h3>
          <div className="form-group">
            <label className="form-label">Çekiliş Adı</label>
            <input type="text" className="form-input" placeholder="Örn: Yılbaşı Büyük Çekilişi" value={brand.raffleName} onChange={e => setBrand({...brand, raffleName: e.target.value})} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Marka Adı</label>
              <input type="text" className="form-input" placeholder="Örn: Mutfak Yazılımevi" value={brand.name} onChange={e => setBrand({...brand, name: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Marka Logosu</label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px', cursor: 'pointer', color: 'var(--text-main)', fontSize: '14px', minHeight: brand.logo ? '80px' : 'auto' }}>
                {brand.logo ? (
                  <img src={brand.logo} alt="Marka logosu" style={{ maxHeight: '60px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }} />
                ) : (
                  <>
                    <Upload size={16} color="var(--insta-pink)" />
                    Logo Yükle
                  </>
                )}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, (res) => setBrand({...brand, logo: res}))} />
              </label>
              {brand.logo && (
                <button type="button" className="btn btn-secondary" style={{ marginTop: '8px', padding: '4px 10px', fontSize: '11px', width: '100%' }} onClick={() => setBrand({...brand, logo: ''})}>
                  Logoyu Kaldır
                </button>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--glass-border)', margin: '24px 0' }}></div>

          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Award className="gradient-text" /> 3. Ödüller</span>
            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--insta-orange)' }} onClick={addPrize}>+ Yeni Ödül Ekle</button>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {prizes.map((prize, idx) => (
              <div key={prize.id} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '16px', position: 'relative' }}>
                {prizes.length > 1 && (
                  <button onClick={() => removePrize(prize.id)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                )}
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--insta-yellow)' }}>{idx + 1}. Ödül</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Ödül / Ürün Adı</label>
                    <input type="text" className="form-input" style={{ padding: '8px 12px' }} placeholder="Örn: iPhone 15" value={prize.name} onChange={e => updatePrize(prize.id, 'name', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Ürün Resmi (Opsiyonel)</label>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', minHeight: prize.image ? '70px' : 'auto' }}>
                      {prize.image ? (
                        <img src={prize.image} alt={prize.name || `${idx + 1}. ödül`} style={{ maxHeight: '56px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }} />
                      ) : (
                        <>
                          <ImageIcon size={14} color="var(--insta-blue)" /> Resim Seç
                        </>
                      )}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, (res) => updatePrize(prize.id, 'image', res))} />
                    </label>
                    {prize.image && (
                      <button type="button" className="btn btn-secondary" style={{ marginTop: '6px', padding: '3px 8px', fontSize: '10px', width: '100%' }} onClick={() => updatePrize(prize.id, 'image', '')}>
                        Resmi Kaldır
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Asil Kazanan Sayısı</label>
                    <input type="number" min="1" className="form-input" style={{ padding: '8px 12px' }} value={prize.winnerCount} onChange={e => updatePrize(prize.id, 'winnerCount', Math.max(1, parseInt(e.target.value)||1))} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>Yedek Kazanan Sayısı</label>
                    <input type="number" min="0" className="form-input" style={{ padding: '8px 12px' }} value={prize.substituteCount} onChange={e => updatePrize(prize.id, 'substituteCount', Math.max(0, parseInt(e.target.value)||0))} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--glass-border)', margin: '16px 0', paddingTop: '16px' }}></div>

          <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ListFilter className="gradient-text" size={20} /> 4. Kurallar ve Filtreler
          </h4>

          <div className="form-group">
            <label className="form-label">Katılım Hak Tipi</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                className={`btn ${entryMethod === 'one_per_user' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '13px', padding: '10px' }}
                onClick={() => { setEntryMethod('one_per_user'); setWeightedEntry(false); }}
              >
                Her Kullanıcıya Tek Hak
              </button>
              <button
                type="button"
                className={`btn ${entryMethod === 'one_per_comment' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '13px', padding: '10px' }}
                disabled={weightedEntry}
                onClick={() => setEntryMethod('one_per_comment')}
              >
                Her Yorum Bir Hak
              </button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--glass-border)', margin: '16px 0', paddingTop: '16px' }}></div>

          <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '14px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ListFilter size={16} color="var(--insta-orange)" /> Arkadaş Etiketleme Filtreleri
          </h4>

          <div className="form-group">
            <label className="form-label">En Az Etiket Şartı (Kişi Sayısı)</label>
            <input
              type="number"
              min="0"
              className="form-input"
              value={minMentions}
              onChange={(e) => setMinMentions(Math.max(0, parseInt(e.target.value) || 0))}
            />
          </div>

          {minMentions > 0 && (
            <>
              <div className="form-group">
                <label className="form-label">Etiket Kontrol Yöntemi</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    className={`btn ${mentionMode === 'per_comment' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '12px', padding: '8px' }}
                    onClick={() => { setMentionMode('per_comment'); setWeightedEntry(false); }}
                  >
                    Yorum Başına
                  </button>
                  <button
                    type="button"
                    className={`btn ${mentionMode === 'cumulative' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '12px', padding: '8px' }}
                    onClick={() => setMentionMode('cumulative')}
                  >
                    Toplam Kümülatif
                  </button>
                </div>
              </div>

              {mentionMode === 'cumulative' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', background: 'rgba(255, 255, 255, 0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                  <input
                    type="checkbox"
                    id="weightedEntry"
                    checked={weightedEntry}
                    onChange={(e) => {
                      setWeightedEntry(e.target.checked);
                      if (e.target.checked) setEntryMethod('one_per_user'); // Ağırlıklı hak seçildiğinde yorum başı hak devredışı kalır
                    }}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--insta-pink)' }}
                  />
                  <label htmlFor="weightedEntry" style={{ fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                    Etiket Katsayısına Göre Ağırlıklı Hak (Bonus Şans)
                    <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                      Kullanıcının etiket sayısı {minMentions}'e bölünür. Çıkan tam sayı kadar bilet alır.
                    </span>
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="checkbox"
                  id="uniqueMentions"
                  checked={uniqueMentions}
                  onChange={(e) => setUniqueMentions(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--insta-pink)' }}
                />
                <label htmlFor="uniqueMentions" style={{ fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                  Aynı Kişileri Etiketlemeyi Engelle (Benzersiz Etiketler)
                </label>
              </div>
            </>
          )}

          <div style={{ borderTop: '1px solid var(--glass-border)', margin: '16px 0' }}></div>

          <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>
            Kelime ve Kullanıcı Filtreleri
          </h4>

          <div className="form-group">
            <label className="form-label">Zorunlu Kelime veya Hashtag (İsteğe Bağlı)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Örn: #cekilis, katılıyorum"
              value={keywordRequired}
              onChange={(e) => setKeywordRequired(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Yasaklı Kelimeler (Virgülle Ayırın - İsteğe Bağlı)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Örn: bot, spam, sahte"
              value={keywordBlacklist}
              onChange={(e) => setKeywordBlacklist(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Engellenen Katılımcılar (Virgülle Ayırın - İsteğe Bağlı)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Örn: @kendi_hesabiniz, @spam_user"
              value={userBlacklist}
              onChange={(e) => setUserBlacklist(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* DETAYLI ÖNİZLEME VE BAŞLATMA ALANI */}
      <div className="glass-container" style={{ padding: '24px', display: 'flex', flexDirection: 'column', mdDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
        
        {/* İstatistikler */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px', width: '100%', textAlign: 'center' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Toplam Yorum</span>
            <strong style={{ fontSize: '20px', fontFamily: 'var(--font-title)', fontWeight: 800 }}>{comments.length}</strong>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Benzersiz Kişi</span>
            <strong style={{ fontSize: '20px', fontFamily: 'var(--font-title)', fontWeight: 800 }}>{Array.from(new Set(comments.map(c => c.username.toLowerCase()))).length}</strong>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Geçerli Katılımcı</span>
            <strong style={{ fontSize: '20px', fontFamily: 'var(--font-title)', fontWeight: 800, color: 'var(--insta-orange)' }}>{uniqueParticipantsCount}</strong>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Toplam Bilet</span>
            <strong style={{ fontSize: '20px', fontFamily: 'var(--font-title)', fontWeight: 800, color: 'var(--insta-pink)' }}>{ticketsPool.length}</strong>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ödül Sayısı</span>
            <strong style={{ fontSize: '20px', fontFamily: 'var(--font-title)', fontWeight: 800, color: 'var(--insta-yellow)' }}>{prizes.length}</strong>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Asil / Yedek</span>
            <strong style={{ fontSize: '20px', fontFamily: 'var(--font-title)', fontWeight: 800, color: 'var(--insta-blue)' }}>
              {prizes.reduce((s, p) => s + parseInt(p.winnerCount || 0), 0)} / {prizes.reduce((s, p) => s + parseInt(p.substituteCount || 0), 0)}
            </strong>
          </div>
        </div>

        {/* Bilgilendirme ve Başlat Butonu */}
        <div style={{ display: 'flex', flexDirection: 'column', smDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', borderTop: '1px solid var(--glass-border)', paddingTop: '20px', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <Info size={16} color="var(--insta-blue)" />
            <span>Çekilişe hazır {ticketsPool.length} bilet (hak) var. Çekilişi başlatarak animasyon ekranına geçebilirsiniz.</span>
          </div>

          <button
            className="btn btn-primary pulse-glow"
            style={{ width: '100%', maxWidth: '280px', padding: '14px 28px', fontSize: '16px' }}
            disabled={ticketsPool.length === 0}
            onClick={handleStartRaffle}
          >
            <Play size={18} fill="white" /> Çekilişi Hazırla ➔
          </button>
        </div>
      </div>
      
    </div>
  );
}
