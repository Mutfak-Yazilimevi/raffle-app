import React from 'react';
import {
  Settings, Upload, ListFilter, Award, Image as ImageIcon, Trash2,
  FileText, Download, FolderOpen, Share2, ArrowRight, Megaphone,
} from 'lucide-react';
import StoryBackgroundPicker from './StoryBackgroundPicker';

export default function RaffleConfigStep({ form, onNext, onBackToAnnouncement }) {
  const {
    brand, setBrand, prizes, addPrize, removePrize, updatePrize,
    entryMethod, setEntryMethod, minMentions, setMinMentions,
    mentionMode, setMentionMode, weightedEntry, setWeightedEntry,
    uniqueMentions, setUniqueMentions, keywordRequired, setKeywordRequired,
    keywordBlacklist, setKeywordBlacklist, userBlacklist, setUserBlacklist,
    requiredFollowAccounts, setRequiredFollowAccounts,
    minRequiredFollows, setMinRequiredFollows, followAccountList,
    showPrizeProductsInResultsStory, setShowPrizeProductsInResultsStory,
    storyBackgroundId, setStoryBackgroundId,
    handleImageUpload, storageWarning, configMessage,
    generatingSetupStory, handleExportConfigTxt, handleImportConfigTxt,
    handleGenerateSetupStory, configFileInputRef,
  } = form;

  return (
    <div className="step-page">
      {storageWarning && (
        <div className="glass-container step-card-full" style={{ padding: '12px 16px', background: 'rgba(251, 173, 80, 0.1)', borderColor: 'rgba(251, 173, 80, 0.3)', borderRadius: '12px', fontSize: '13px', color: 'var(--insta-orange)' }}>
          {storageWarning}
        </div>
      )}

      <div className="step-cards-grid">
      <div className="glass-container step-card" style={{ padding: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Settings className="gradient-text" /> Marka ve Çekiliş Bilgileri
        </h3>
        <div className="form-group">
          <label className="form-label">Çekiliş Adı</label>
          <input type="text" className="form-input" placeholder="Örn: Yılbaşı Büyük Çekilişi" value={brand.raffleName} onChange={(e) => setBrand({ ...brand, raffleName: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Instagram Gönderi Linki (Opsiyonel)</label>
          <input
            type="url"
            className="form-input"
            placeholder="https://www.instagram.com/p/..."
            value={brand.postUrl || ''}
            onChange={(e) => setBrand({ ...brand, postUrl: e.target.value })}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Chrome eklentisi sayfasındaki &quot;Instagram&apos;ı Aç&quot; butonu bu adrese gider.
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Marka Adı</label>
            <input type="text" className="form-input" placeholder="Örn: Mutfak Yazılımevi" value={brand.name} onChange={(e) => setBrand({ ...brand, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Marka Logosu</label>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--bg-inset)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px', cursor: 'pointer', color: 'var(--text-main)', fontSize: '14px', minHeight: brand.logo ? '80px' : 'auto' }}>
              {brand.logo ? (
                <img src={brand.logo} alt="Marka logosu" style={{ maxHeight: '60px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }} />
              ) : (
                <>
                  <Upload size={16} color="var(--insta-pink)" />
                  Logo Yükle
                </>
              )}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, (res) => setBrand({ ...brand, logo: res }))} />
            </label>
            {brand.logo && (
              <button type="button" className="btn btn-secondary" style={{ marginTop: '8px', padding: '4px 10px', fontSize: '11px', width: '100%' }} onClick={() => setBrand({ ...brand, logo: '' })}>
                Logoyu Kaldır
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="glass-container step-card" style={{ padding: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Award className="gradient-text" /> Ödüller</span>
          <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--insta-orange)' }} onClick={addPrize}>+ Yeni Ödül Ekle</button>
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {prizes.map((prize, idx) => (
            <div key={prize.id} style={{ background: 'var(--bg-inset)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '16px', position: 'relative' }}>
              {prizes.length > 1 && (
                <button type="button" onClick={() => removePrize(prize.id)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              )}
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--insta-yellow)' }}>{idx + 1}. Ödül</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Ödül / Ürün Adı</label>
                  <input type="text" className="form-input" style={{ padding: '8px 12px' }} placeholder="Örn: iPhone 15" value={prize.name} onChange={(e) => updatePrize(prize.id, 'name', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Ürün Resmi (Opsiyonel)</label>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--bg-inset)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', minHeight: prize.image ? '70px' : 'auto' }}>
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
                  <input type="number" min="1" className="form-input" style={{ padding: '8px 12px' }} value={prize.winnerCount} onChange={(e) => updatePrize(prize.id, 'winnerCount', Math.max(1, parseInt(e.target.value, 10) || 1))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Yedek Kazanan Sayısı</label>
                  <input type="number" min="0" className="form-input" style={{ padding: '8px 12px' }} value={prize.substituteCount} onChange={(e) => updatePrize(prize.id, 'substituteCount', Math.max(0, parseInt(e.target.value, 10) || 0))} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-container step-card" style={{ padding: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ListFilter className="gradient-text" size={20} /> Kurallar ve Filtreler
        </h3>

        <div className="form-group">
          <label className="form-label">Katılım Hak Tipi</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button type="button" className={`btn ${entryMethod === 'one_per_user' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '13px', padding: '10px' }} onClick={() => { setEntryMethod('one_per_user'); setWeightedEntry(false); }}>
              Her Kullanıcıya Tek Hak
            </button>
            <button type="button" className={`btn ${entryMethod === 'one_per_comment' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '13px', padding: '10px' }} disabled={weightedEntry} onClick={() => setEntryMethod('one_per_comment')}>
              Her Yorum Bir Hak
            </button>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--glass-border)', margin: '16px 0', paddingTop: '16px' }} />

        <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Arkadaş Etiketleme Filtreleri</h4>

        <div className="form-group">
          <label className="form-label">En Az Etiket Şartı (Kişi Sayısı)</label>
          <input type="number" min="0" className="form-input" value={minMentions} onChange={(e) => setMinMentions(Math.max(0, parseInt(e.target.value, 10) || 0))} />
        </div>

        {minMentions > 0 && (
          <>
            <div className="form-group">
              <label className="form-label">Etiket Kontrol Yöntemi</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button type="button" className={`btn ${mentionMode === 'per_comment' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '12px', padding: '8px' }} onClick={() => { setMentionMode('per_comment'); setWeightedEntry(false); }}>
                  Yorum Başına
                </button>
                <button type="button" className={`btn ${mentionMode === 'cumulative' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: '12px', padding: '8px' }} onClick={() => setMentionMode('cumulative')}>
                  Toplam Kümülatif
                </button>
              </div>
            </div>

            {mentionMode === 'cumulative' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', background: 'rgba(255, 255, 255, 0.02)', padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <input type="checkbox" id="weightedEntry" checked={weightedEntry} onChange={(e) => { setWeightedEntry(e.target.checked); if (e.target.checked) setEntryMethod('one_per_user'); }} style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--insta-pink)' }} />
                <label htmlFor="weightedEntry" style={{ fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                  Etiket Katsayısına Göre Ağırlıklı Hak (Bonus Şans)
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>
                    Kullanıcının etiket sayısı {minMentions}&apos;e bölünür. Çıkan tam sayı kadar bilet alır.
                  </span>
                </label>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <input type="checkbox" id="uniqueMentions" checked={uniqueMentions} onChange={(e) => setUniqueMentions(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--insta-pink)' }} />
              <label htmlFor="uniqueMentions" style={{ fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                Aynı Kişileri Etiketlemeyi Engelle (Benzersiz Etiketler)
              </label>
            </div>
          </>
        )}

        <div style={{ borderTop: '1px solid var(--glass-border)', margin: '16px 0' }} />

        <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Kelime ve Kullanıcı Filtreleri</h4>

        <div className="form-group">
          <label className="form-label">Zorunlu Kelime veya Hashtag (İsteğe Bağlı)</label>
          <input type="text" className="form-input" placeholder="Örn: #cekilis, katılıyorum" value={keywordRequired} onChange={(e) => setKeywordRequired(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Yasaklı Kelimeler (Virgülle Ayırın)</label>
          <input type="text" className="form-input" placeholder="Örn: bot, spam, sahte" value={keywordBlacklist} onChange={(e) => setKeywordBlacklist(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Engellenen Katılımcılar (Virgülle Ayırın)</label>
          <input type="text" className="form-input" placeholder="Örn: @kendi_hesabiniz, @spam_user" value={userBlacklist} onChange={(e) => setUserBlacklist(e.target.value)} />
        </div>

        <div style={{ borderTop: '1px solid var(--glass-border)', margin: '16px 0', paddingTop: '16px' }} />

        <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Takip Şartları</h4>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.6 }}>
          Katılımcıların takip etmesi gereken hesapları tanımlayın. Chrome eklentisi profilleri gezerek bu şartı doğrular.
        </p>
        <div className="form-group">
          <label className="form-label">Takip Edilmesi Gereken Hesaplar</label>
          <input
            type="text"
            className="form-input"
            placeholder="Örn: @marka_hesabi, @partner1, @partner2"
            value={requiredFollowAccounts}
            onChange={(e) => setRequiredFollowAccounts(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">En Az Kaç Hesap Takip Edilmeli?</label>
          <input
            type="number"
            min="1"
            className="form-input"
            value={minRequiredFollows}
            onChange={(e) => setMinRequiredFollows(Math.max(1, parseInt(e.target.value, 10) || 1))}
            disabled={!requiredFollowAccounts.trim()}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Listede {followAccountList.length || 0} hesap var. Tümünü zorunlu kılmak için sayıyı listeye eşitleyin.
          </span>
        </div>
      </div>

      <div className="glass-container step-card" style={{ padding: '24px' }}>
        <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <FileText className="gradient-text" /> Tanımları Kaydet ve Paylaş
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
          Çekiliş öncesi tanımlarınızı kaydedin veya ön duyuru story görseli oluşturun. Çekiliş günü TXT dosyasını yüklemeniz yeterli.
        </p>
        <StoryBackgroundPicker value={storyBackgroundId} onChange={setStoryBackgroundId} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '16px', background: 'var(--bg-muted)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
          <input
            type="checkbox"
            id="showPrizeProductsInResultsStory"
            checked={showPrizeProductsInResultsStory}
            onChange={(e) => setShowPrizeProductsInResultsStory(e.target.checked)}
            style={{ cursor: 'pointer', width: '16px', height: '16px', marginTop: '2px', accentColor: 'var(--insta-pink)' }}
          />
          <label htmlFor="showPrizeProductsInResultsStory" style={{ fontSize: '13px', cursor: 'pointer', lineHeight: 1.6 }}>
            <strong>Sonuç story&apos;sinde kazanılan ürünleri göster</strong>
            <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, marginTop: '4px' }}>
              Açıkken çekiliş sonuç story görselinde her kazananın yanında ödül adı ve ürün görseli yer alır.
            </span>
          </label>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={handleExportConfigTxt}>
            <Download size={16} /> Ayarları TXT İndir
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => configFileInputRef.current?.click()}>
            <FolderOpen size={16} /> Ayarları TXT Yükle
          </button>
          <button type="button" className="btn btn-primary" onClick={handleGenerateSetupStory} disabled={generatingSetupStory}>
            <Share2 size={16} /> {generatingSetupStory ? 'Oluşturuluyor...' : 'Ön Duyuru Story'}
          </button>
          <input ref={configFileInputRef} type="file" accept=".txt" style={{ display: 'none' }} onChange={handleImportConfigTxt} />
        </div>
        {configMessage && (
          <p style={{ marginTop: '14px', marginBottom: 0, fontSize: '13px', color: 'var(--insta-yellow)', background: 'var(--bg-inset)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            {configMessage}
          </p>
        )}
      </div>
      </div>

      <div className="step-card-full" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        {onBackToAnnouncement && (
          <button type="button" className="btn btn-secondary" style={{ padding: '14px 20px', fontSize: '14px' }} onClick={onBackToAnnouncement}>
            <Megaphone size={16} /> İlan Sayfasına Dön
          </button>
        )}
        <button type="button" className="btn btn-primary pulse-glow" style={{ padding: '14px 28px', fontSize: '16px', marginLeft: 'auto' }} onClick={onNext}>
          Yorumları Yükle <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
