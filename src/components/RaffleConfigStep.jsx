import { useState } from 'react';
import {
  Settings, Upload, ListFilter, Award, Image as ImageIcon, Trash2,
  FileText, Download, FolderOpen, Share2, ArrowRight, Megaphone, Save, Calendar, Sparkles, KeyRound, Wand2,
  LayoutTemplate, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import StoryBackgroundPicker from './StoryBackgroundPicker';
import ParticipationCriteriaSection from './ParticipationCriteriaSection';
import { CriteriaCheckbox, CommentRulesSection, EntryMethodSection, FormFieldHelp, PostInteractionSection } from './rules';
import { CRITERIA_COPY } from '../constants/ruleHelpCopy';
import RaffleSetupWizard from './RaffleSetupWizard';
import { BUILTIN_TEMPLATES } from '../utils/builtinTemplates';
import { listUserTemplates, saveTemplate, deleteTemplate, applyTemplate } from '../utils/templateStorage';

export default function RaffleConfigStep({ form, onNext, onBackToAnnouncement, onRaffleSaved }) {
  const {
    brand, setBrand, prizes, addPrize, removePrize, updatePrize,
    entryMethod, setEntryMethod, weightedEntry, setWeightedEntry,
    showPrizeProductsInResultsStory, setShowPrizeProductsInResultsStory,
    storyBackgroundId, setStoryBackgroundId,
    handleImageUpload, storageWarning, configMessage, savingRaffle,
    handleSaveRaffle, generatingSetupStory, handleExportConfigTxt, handleImportConfigTxt,
    handleGenerateSetupStory, configFileInputRef,
    requireComment,
    postImportMessage,
    generatingWithAI, aiMessage, setAiMessage, handleGenerateWithAI, handleParsePostWithAI,
  } = form;

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [wizardMode, setWizardMode] = useState(() => !form.brand?.raffleName?.trim());
  const [showSchedule, setShowSchedule] = useState(
    () => !!(form.brand?.entryStartDate || form.brand?.entryEndDate || form.brand?.drawDate),
  );
  const [showTemplates, setShowTemplates] = useState(false);
  const [userTemplates, setUserTemplates] = useState(() => listUserTemplates());
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const templateSetters = {
    setEntryMethod: form.setEntryMethod,
    setRequireComment: form.setRequireComment,
    setRequireLike: form.setRequireLike,
    setRequireSave: form.setRequireSave,
    setRequireFollowAccounts: form.setRequireFollowAccounts,
    setRequireMentionRule: form.setRequireMentionRule,
    setMinMentions: form.setMinMentions,
    setMaxMentions: form.setMaxMentions,
    setMentionMode: form.setMentionMode,
    setWeightedEntry: form.setWeightedEntry,
    setUniqueMentions: form.setUniqueMentions,
    setKeywordRequired: form.setKeywordRequired,
    setMaxCommentsPerUser: form.setMaxCommentsPerUser,
  };

  function handleApplyTemplate(template) {
    applyTemplate(template, templateSetters);
    setShowTemplates(false);
  }

  function handleSaveCurrentAsTemplate() {
    if (!newTemplateName.trim()) return;
    const { buildSetupConfig } = form;
    const config = buildSetupConfig ? buildSetupConfig() : {};
    const rules = config.rules || {};
    const updated = saveTemplate(newTemplateName, rules);
    setUserTemplates(updated);
    setNewTemplateName('');
    setShowSaveTemplate(false);
  }

  function handleDeleteUserTemplate(id) {
    const updated = deleteTemplate(id);
    setUserTemplates(updated);
  }

  const handleSaveClick = async () => {
    const saved = await handleSaveRaffle();
    if (saved && onRaffleSaved) {
      onRaffleSaved();
    }
  };

  if (wizardMode) {
    return (
      <RaffleSetupWizard
        form={form}
        onNext={onNext}
        onRaffleSaved={onRaffleSaved}
        onExpertMode={() => setWizardMode(false)}
      />
    );
  }

  return (
    <div className="step-page">
      <div className="step-card-full" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '-8px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: '12px', gap: '6px', padding: '6px 14px' }}
          onClick={() => configFileInputRef.current?.click()}
        >
          <FolderOpen size={13} /> TXT Yükle
        </button>
        <input ref={configFileInputRef} type="file" accept=".txt" style={{ display: 'none' }} onChange={handleImportConfigTxt} />
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: '12px', gap: '6px', padding: '6px 14px' }}
          onClick={() => setWizardMode(true)}
        >
          <Wand2 size={13} /> Sihirbaz Modu
        </button>
      </div>
      {storageWarning && (
        <div className="glass-container step-card-full" style={{ padding: '12px 16px', background: 'rgba(251, 173, 80, 0.1)', borderColor: 'rgba(251, 173, 80, 0.3)', borderRadius: '12px', fontSize: '13px', color: 'var(--insta-orange)' }}>
          {storageWarning}
        </div>
      )}

      <div className="config-step-layout">
        <div className="config-step-column config-step-column--left">
          <div className="glass-container step-card" style={{ padding: '24px' }}>
        <h3 className="card-heading flex-row" style={{ marginBottom: '16px' }}>
          <Settings className="gradient-text" /> Marka ve Çekiliş Bilgileri
        </h3>
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Çekiliş Adı</span>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '4px 10px', fontSize: '11px', gap: '4px', borderRadius: '6px' }}
              onClick={() => { setAiMessage(''); handleGenerateWithAI(); }}
              disabled={generatingWithAI}
            >
              <Sparkles size={12} /> {generatingWithAI ? 'Oluşturuluyor…' : 'AI ile Oluştur'}
            </button>
          </label>
          <input type="text" className="form-input" placeholder="Örn: Yılbaşı Büyük Çekilişi" value={brand.raffleName} onChange={(e) => setBrand({ ...brand, raffleName: e.target.value })} />
          {aiMessage && (
            <span style={{ fontSize: '11px', color: aiMessage.startsWith('✓') ? 'var(--insta-green, #10b981)' : '#ef4444' }}>
              {aiMessage}
            </span>
          )}
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
            Chrome eklentisi ve Yorumlar adımındaki &quot;Instagram&apos;ı Aç&quot; butonu bu adrese gider.
            Eklentide &quot;Post&apos;tan Doldur&quot; bölümüne URL yapıştırarak bilgileri otomatik aktarabilirsiniz.
          </span>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: '8px', width: '100%', fontSize: '12px', gap: '6px' }}
            onClick={() => { setAiMessage(''); handleParsePostWithAI(); }}
            disabled={generatingWithAI || (!brand.postUrl && !brand.postDescription)}
          >
            <Sparkles size={13} /> {generatingWithAI ? 'Analiz ediliyor…' : 'AI ile Formu Doldur'}
          </button>
          {postImportMessage && (
            <span
              role="status"
              style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: 'var(--insta-green, #10b981)' }}
            >
              ✓ {postImportMessage}
            </span>
          )}
        </div>

        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
          <button
            type="button"
            style={{ background: 'none', border: 'none', padding: 0, width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: showSchedule ? '14px' : 0 }}
            onClick={() => setShowSchedule((v) => !v)}
          >
            <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Calendar className="gradient-text" size={18} /> Çekiliş Takvimi
              <span style={{ fontWeight: 400, fontSize: '11px', color: 'var(--text-muted)' }}>— opsiyonel</span>
            </h4>
            {showSchedule ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
          </button>

          {showSchedule && (
            <>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
                Katılım dönemi ve çekiliş tarihi ön duyuru story&apos;sinde ve ilan sayfasında gösterilir.
              </p>
              {[
                { label: 'Katılım başlangıcı', dateKey: 'entryStartDate', timeKey: 'entryStartTime' },
                { label: 'Katılım bitişi', dateKey: 'entryEndDate', timeKey: 'entryEndTime' },
                { label: 'Çekiliş tarihi ve saati', dateKey: 'drawDate', timeKey: 'drawTime' },
              ].map(({ label, dateKey, timeKey }) => (
                <div key={dateKey} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                    <label className="form-label" style={{ fontSize: '12px' }}>{label}</label>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input type="date" className="form-input" value={brand[dateKey] || ''} onChange={(e) => setBrand({ ...brand, [dateKey]: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <input type="time" className="form-input" value={brand[timeKey] || ''} onChange={(e) => setBrand({ ...brand, [timeKey]: e.target.value })} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="field-row-2">
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
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, (res) => setBrand({ ...brand, logo: res }), 'logo')} />
            </label>
            {brand.logo && (
              <button type="button" className="btn btn-secondary" style={{ marginTop: '8px', padding: '4px 10px', fontSize: '11px', width: '100%' }} onClick={() => setBrand({ ...brand, logo: '' })}>
                Logoyu Kaldır
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
          <button
            type="button"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setShowApiKey((v) => !v)}
          >
            <KeyRound size={13} /> AI Ayarı {showApiKey ? '▲' : '▼'}
          </button>
          {showApiKey && (
            <div className="form-group" style={{ marginTop: '10px', marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Google Gemini API Anahtarı</label>
              <input
                type="password"
                className="form-input"
                placeholder="AIza…"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  localStorage.setItem('gemini_api_key', e.target.value);
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Tarayıcınızda saklanır.{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--insta-blue)' }}>
                  aistudio.google.com
                </a>{' '}adresinden API anahtarı alın.
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="glass-container step-card" style={{ padding: '24px' }}>
        <h3 className="card-heading flex-row--between" style={{ marginBottom: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Award className="gradient-text" /> Ödüller</span>
          <button type="button" className="btn btn-secondary btn--sm" style={{ borderColor: 'var(--insta-orange)' }} onClick={addPrize}>+ Yeni Ödül Ekle</button>
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
              <div className="field-row-2" style={{ gap: '12px', marginBottom: '12px' }}>
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
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleImageUpload(e, (res) => updatePrize(prize.id, 'image', res), 'prize')} />
                  </label>
                  {prize.image && (
                    <button type="button" className="btn btn-secondary" style={{ marginTop: '6px', padding: '3px 8px', fontSize: '10px', width: '100%' }} onClick={() => updatePrize(prize.id, 'image', '')}>
                      Resmi Kaldır
                    </button>
                  )}
                </div>
              </div>
              <div className="field-row-2" style={{ gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Asil Kazanan Sayısı</label>
                  <FormFieldHelp whenActive={`Bu ödül için çekilişte ${prize.winnerCount} asil kazanan seçilir; her biri farklı kişi olmalıdır.`}>
                    Asil kazananlar ödülü doğrudan alır.
                  </FormFieldHelp>
                  <input type="number" min="1" className="form-input" style={{ padding: '8px 12px' }} value={prize.winnerCount} onChange={(e) => updatePrize(prize.id, 'winnerCount', Math.max(1, parseInt(e.target.value, 10) || 1))} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Yedek Kazanan Sayısı</label>
                  <FormFieldHelp whenActive={prize.substituteCount > 0 ? `${prize.substituteCount} yedek sırayla tutulur; asil kazanan ulaşılamazsa veya şartları sağlamazsa devreye girer.` : undefined}>
                    Asil kazananlar ulaşılamazsa veya şartları sağlamazsa yedekler devreye girer. 0 = yedek yok.
                  </FormFieldHelp>
                  <input type="number" min="0" className="form-input" style={{ padding: '8px 12px' }} value={prize.substituteCount} onChange={(e) => updatePrize(prize.id, 'substituteCount', Math.max(0, parseInt(e.target.value, 10) || 0))} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
        </div>

        <div className="config-step-column config-step-column--right">

          {/* Template picker card */}
          <div className="glass-container step-card" style={{ padding: '16px 20px', marginBottom: '0' }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', padding: 0, width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
              onClick={() => setShowTemplates((v) => !v)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-title)', fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                <LayoutTemplate size={16} className="gradient-text" /> Şablondan Başla
              </span>
              {showTemplates ? <ChevronUp size={15} color="var(--text-muted)" /> : <ChevronDown size={15} color="var(--text-muted)" />}
            </button>

            {showTemplates && (
              <div style={{ marginTop: '14px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 10px' }}>Hazır Şablonlar</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                  {BUILTIN_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '5px 12px' }}
                      title={tpl.description}
                      onClick={() => handleApplyTemplate(tpl)}
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>

                {userTemplates.length > 0 && (
                  <>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 10px' }}>Kayıtlı Şablonlarım</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      {userTemplates.map((tpl) => (
                        <span key={tpl.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ fontSize: '12px', padding: '5px 12px' }}
                            onClick={() => handleApplyTemplate(tpl)}
                          >
                            {tpl.name}
                          </button>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', padding: '2px', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}
                            title="Şablonu sil"
                            onClick={() => handleDeleteUserTemplate(tpl.id)}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {showSaveTemplate ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Şablon adı"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      style={{ fontSize: '12px', padding: '6px 10px', flex: 1 }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveCurrentAsTemplate()}
                    />
                    <button type="button" className="btn btn-primary btn--sm" style={{ flexShrink: 0 }} onClick={handleSaveCurrentAsTemplate}>
                      Kaydet
                    </button>
                    <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => { setShowSaveTemplate(false); setNewTemplateName(''); }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '12px', padding: '5px 12px' }}
                    onClick={() => setShowSaveTemplate(true)}
                  >
                    <Save size={12} /> Mevcut kuralları şablon kaydet
                  </button>
                )}
              </div>
            )}
          </div>

      <div className="glass-container step-card" style={{ padding: '24px' }}>
        <h3 className="card-heading flex-row" style={{ marginBottom: '16px' }}>
          <ListFilter className="gradient-text" size={20} /> Kurallar ve Filtreler
        </h3>

        <PostInteractionSection form={form} first />

        <div className="rule-section-divider" />

        {requireComment ? (
          <>
            <EntryMethodSection
              entryMethod={entryMethod}
              setEntryMethod={setEntryMethod}
              weightedEntry={weightedEntry}
              setWeightedEntry={setWeightedEntry}
            />

            <div className="rule-section-divider" />

            <CommentRulesSection form={form} />
          </>
        ) : (
          <div className="rule-nested-panel" style={{ marginBottom: '16px' }}>
            <FormFieldHelp whenActive="Katılımcı listesi yine Chrome eklentisi ile oluşturulur; yorum zorunluluğu duyuruda yer almaz.">
              Yorum şartı kapalıyken yorum metni kuralları ve katılım hak tipi ayarlanmaz.
            </FormFieldHelp>
          </div>
        )}

        <ParticipationCriteriaSection form={form} />

        <div className="rule-section-divider" />
        <div className="rules-save-panel">
          <p className="rule-section-intro">
            Marka, ödül ve kural tanımlarınız tarayıcıda saklanır. Sonraki adıma geçmeden önce kaydedin.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveClick}
            disabled={savingRaffle}
            style={{ width: '100%' }}
          >
            <Save size={16} /> {savingRaffle ? 'Kaydediliyor...' : 'Çekilişi Kaydet'}
          </button>
          {configMessage && (
            <p className="rules-save-panel__message">{configMessage}</p>
          )}
        </div>
      </div>

      <div className="glass-container step-card" style={{ padding: '24px' }}>
        <h3 className="card-heading flex-row" style={{ marginBottom: '8px' }}>
          <FileText className="gradient-text" /> Tanımları Kaydet ve Paylaş
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
          Çekiliş öncesi tanımlarınızı kaydedin veya ön duyuru story görseli oluşturun. Çekiliş günü TXT dosyasını yüklemeniz yeterli.
        </p>
        <StoryBackgroundPicker value={storyBackgroundId} onChange={setStoryBackgroundId} />
        <CriteriaCheckbox
          id="showPrizeProductsInResultsStory"
          checked={showPrizeProductsInResultsStory}
          onChange={setShowPrizeProductsInResultsStory}
          label={CRITERIA_COPY.showPrizeProductsInResultsStory.label}
          description={CRITERIA_COPY.showPrizeProductsInResultsStory.description}
          whenEnabled={CRITERIA_COPY.showPrizeProductsInResultsStory.whenEnabled}
          highlighted
          className="rule-checkbox-block--spaced"
        />
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={handleExportConfigTxt}>
            <Download size={16} /> Ayarları TXT İndir
          </button>
          <button type="button" className="btn btn-primary" onClick={handleGenerateSetupStory} disabled={generatingSetupStory}>
            <Share2 size={16} /> {generatingSetupStory ? 'Oluşturuluyor...' : 'Ön Duyuru Story'}
          </button>
        </div>
        {configMessage && (
          <p style={{ marginTop: '14px', marginBottom: 0, fontSize: '13px', color: 'var(--insta-yellow)', background: 'var(--bg-inset)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            {configMessage}
          </p>
        )}
      </div>
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
