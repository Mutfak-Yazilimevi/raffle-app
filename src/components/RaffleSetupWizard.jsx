import { useState } from 'react';
import {
  Settings, Award, ListFilter, Sliders, CheckCircle,
  ArrowLeft, ArrowRight, Save, Share2, Download, FolderOpen,
  Upload, Trash2, Image as ImageIcon, Sparkles, KeyRound, Calendar,
  ChevronUp, ChevronDown,
} from 'lucide-react';
import StoryBackgroundPicker from './StoryBackgroundPicker';
import ParticipationCriteriaSection from './ParticipationCriteriaSection';
import { CriteriaCheckbox, CommentRulesSection, EntryMethodSection, PostInteractionSection } from './rules';
import { getRulesSummaryLines } from '../utils/raffleConfigFile';
import { CRITERIA_COPY } from '../constants/ruleHelpCopy';

const STEPS = [
  { key: 'brand', label: 'Marka', Icon: Settings },
  { key: 'prizes', label: 'Ödüller', Icon: Award },
  { key: 'rules', label: 'Kurallar', Icon: ListFilter },
  { key: 'extra', label: 'Ek Kurallar', Icon: Sliders, skippable: true },
  { key: 'summary', label: 'Özet', Icon: CheckCircle },
];

function StepBar({ step, onExpertMode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', flexWrap: 'wrap' }}>
      {STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: 600,
              background: active ? 'var(--insta-gradient)' : done ? 'rgba(16,185,129,0.15)' : 'var(--bg-inset)',
              color: active ? 'white' : done ? 'var(--insta-green, #10b981)' : 'var(--text-muted)',
              border: `1px solid ${active ? 'transparent' : done ? 'rgba(16,185,129,0.3)' : 'var(--glass-border)'}`,
              transition: 'all 0.2s',
            }}>
              {done ? '✓' : i + 1} {s.label}
            </div>
            {i < STEPS.length - 1 && (
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>›</span>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={onExpertMode}
        style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap' }}
      >
        Uzman Modu →
      </button>
    </div>
  );
}

export default function RaffleSetupWizard({ form, onNext, onRaffleSaved, onExpertMode }) {
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSchedule, setShowSchedule] = useState(
    () => !!(form.brand?.entryStartDate || form.brand?.entryEndDate || form.brand?.drawDate),
  );
  const [error, setError] = useState('');

  const {
    brand, setBrand, prizes, addPrize, removePrize, updatePrize,
    entryMethod, setEntryMethod, weightedEntry, setWeightedEntry,
    showPrizeProductsInResultsStory, setShowPrizeProductsInResultsStory,
    storyBackgroundId, setStoryBackgroundId,
    handleImageUpload, savingRaffle, configMessage, handleSaveRaffle,
    generatingWithAI, aiMessage, setAiMessage, handleGenerateWithAI, handleParsePostWithAI,
    postImportMessage, requireComment,
    handleExportConfigTxt, handleImportConfigTxt, configFileInputRef,
    generatingSetupStory, handleGenerateSetupStory,
  } = form;

  const validate = () => {
    if (step === 0 && !brand.raffleName?.trim()) {
      setError('Çekiliş adı zorunludur.');
      return false;
    }
    if (step === 1 && !prizes.some((p) => p.name?.trim())) {
      setError('En az bir ödülün adını girin.');
      return false;
    }
    setError('');
    return true;
  };

  const goNext = () => { if (validate()) setStep((s) => s + 1); };
  const goBack = () => { setError(''); setStep((s) => s - 1); };
  const skip = () => { setError(''); setStep((s) => s + 1); };

  const handleSaveClick = async () => {
    const saved = await handleSaveRaffle();
    if (saved && onRaffleSaved) onRaffleSaved();
  };

  const ruleSummary = getRulesSummaryLines(form);

  // ── Step 1: Marka ───────────────────────────────────────────────────────

  const renderBrand = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: '12px', gap: '6px', padding: '6px 14px' }}
          onClick={() => configFileInputRef.current?.click()}
        >
          <FolderOpen size={13} /> TXT Yükle
        </button>
        <input ref={configFileInputRef} type="file" accept=".txt" style={{ display: 'none' }} onChange={handleImportConfigTxt} />
      </div>
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Çekiliş Adı <span style={{ color: '#ef4444' }}>*</span></span>
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
        <input
          type="text"
          className="form-input"
          placeholder="Örn: Yılbaşı Büyük Çekilişi"
          value={brand.raffleName}
          onChange={(e) => setBrand({ ...brand, raffleName: e.target.value })}
        />
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
          <span style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: 'var(--insta-green, #10b981)' }}>
            ✓ {postImportMessage}
          </span>
        )}
      </div>

      <div className="field-row-2">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Marka Adı</label>
          <input
            type="text"
            className="form-input"
            placeholder="Örn: Mutfak Yazılımevi"
            value={brand.name}
            onChange={(e) => setBrand({ ...brand, name: e.target.value })}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Marka Logosu</label>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--bg-inset)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px', cursor: 'pointer', color: 'var(--text-main)', fontSize: '14px', minHeight: brand.logo ? '80px' : 'auto' }}>
            {brand.logo ? (
              <img src={brand.logo} alt="Marka logosu" style={{ maxHeight: '60px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }} />
            ) : (
              <><Upload size={16} color="var(--insta-pink)" /> Logo Yükle</>
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

      <div style={{ paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
        <button
          type="button"
          style={{ background: 'none', border: 'none', padding: 0, width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: showSchedule ? '12px' : 0 }}
          onClick={() => setShowSchedule((v) => !v)}
        >
          <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Calendar className="gradient-text" size={16} /> Çekiliş Takvimi
            <span style={{ fontWeight: 400, fontSize: '11px', color: 'var(--text-muted)' }}>— opsiyonel</span>
          </h4>
          {showSchedule ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
        </button>
        {showSchedule && [
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
      </div>

      <div style={{ paddingTop: '12px', borderTop: '1px solid var(--glass-border)' }}>
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
              onChange={(e) => { setApiKey(e.target.value); localStorage.setItem('gemini_api_key', e.target.value); }}
            />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Tarayıcınızda saklanır.{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--insta-blue)' }}>aistudio.google.com</a>{' '}adresinden alın.
            </span>
          </div>
        )}
      </div>
    </div>
  );

  // ── Step 2: Ödüller ─────────────────────────────────────────────────────

  const renderPrizes = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
        En az bir ödül ekleyin. Birden fazla ödül varsa her biri için kazanan ve yedek sayısı ayrı ayrı belirlenir.
      </p>
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
              <label className="form-label" style={{ fontSize: '12px' }}>Ödül Adı <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="text" className="form-input" style={{ padding: '8px 12px' }} placeholder="Örn: iPhone 15" value={prize.name} onChange={(e) => updatePrize(prize.id, 'name', e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Ürün Resmi (Opsiyonel)</label>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--bg-inset)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', minHeight: prize.image ? '70px' : 'auto' }}>
                {prize.image ? (
                  <img src={prize.image} alt={prize.name || `${idx + 1}. ödül`} style={{ maxHeight: '56px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px' }} />
                ) : (
                  <><ImageIcon size={14} color="var(--insta-blue)" /> Resim Seç</>
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
              <input type="number" min="1" className="form-input" style={{ padding: '8px 12px' }} value={prize.winnerCount} onChange={(e) => updatePrize(prize.id, 'winnerCount', Math.max(1, parseInt(e.target.value, 10) || 1))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Yedek Sayısı</label>
              <input type="number" min="0" className="form-input" style={{ padding: '8px 12px' }} value={prize.substituteCount} onChange={(e) => updatePrize(prize.id, 'substituteCount', Math.max(0, parseInt(e.target.value, 10) || 0))} />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-secondary" style={{ borderColor: 'var(--insta-orange)' }} onClick={addPrize}>
        + Ödül Ekle
      </button>
    </div>
  );

  // ── Step 3: Katılım Kuralları ────────────────────────────────────────────

  const renderRules = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
        Katılımcıların yapması gereken zorunlu eylemleri seçin. Herhangi bir kural belirsizse açıklamaları okuyun.
      </p>
      <PostInteractionSection form={form} first />
      <div className="rule-section-divider" />
      {requireComment ? (
        <>
          <EntryMethodSection entryMethod={entryMethod} setEntryMethod={setEntryMethod} weightedEntry={weightedEntry} setWeightedEntry={setWeightedEntry} />
          <div className="rule-section-divider" />
          <CommentRulesSection form={form} />
        </>
      ) : (
        <div className="rule-nested-panel" style={{ marginBottom: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
          Yorum şartı kapalıyken yorum kuralları geçersizdir.
        </div>
      )}
    </div>
  );

  // ── Step 4: Ek Kurallar (skippable) ─────────────────────────────────────

  const renderExtra = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
        Takip şartı, yaş sınırı, hesap tipi gibi ek kurallar. Bunları ayarlamadan da çekiliş yapılabilir — &ldquo;Atla&rdquo; ile geçebilirsiniz.
      </p>
      <ParticipationCriteriaSection form={form} />
    </div>
  );

  // ── Step 5: Görünüm & Özet ───────────────────────────────────────────────

  const renderSummary = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '15px', fontWeight: 700, margin: '0 0 12px' }}>Story Arka Planı</h4>
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
      </div>

      <div style={{ background: 'var(--bg-inset)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '16px' }}>
        <h4 style={{ fontFamily: 'var(--font-title)', fontSize: '14px', fontWeight: 700, margin: '0 0 12px', color: 'var(--text-main)' }}>
          Çekiliş Özeti
        </h4>
        {brand.raffleName && (
          <p style={{ margin: '0 0 4px', fontSize: '13px' }}>
            <strong>Ad:</strong> {brand.raffleName}
            {brand.name && <span style={{ color: 'var(--text-muted)' }}> · {brand.name}</span>}
          </p>
        )}
        <p style={{ margin: '0 0 10px', fontSize: '13px' }}>
          <strong>Ödül{prizes.length > 1 ? 'ler' : ''}:</strong> {prizes.filter((p) => p.name?.trim()).map((p) => `${p.name} (${p.winnerCount} kazanan)`).join(', ') || '—'}
        </p>
        {ruleSummary.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
            {ruleSummary.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        )}
        {ruleSummary.length === 0 && (
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Kural tanımlanmadı.</p>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button type="button" className="btn btn-primary" onClick={handleSaveClick} disabled={savingRaffle} style={{ width: '100%' }}>
          <Save size={16} /> {savingRaffle ? 'Kaydediliyor...' : 'Çekilişi Kaydet'}
        </button>
        {configMessage && (
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--insta-yellow)', background: 'var(--bg-inset)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            {configMessage}
          </p>
        )}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={handleExportConfigTxt}>
            <Download size={14} /> TXT İndir
          </button>
          <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={handleGenerateSetupStory} disabled={generatingSetupStory}>
            <Share2 size={14} /> {generatingSetupStory ? 'Oluşturuluyor...' : 'Ön Duyuru Story'}
          </button>
        </div>
      </div>
    </div>
  );

  const stepRenderers = [renderBrand, renderPrizes, renderRules, renderExtra, renderSummary];
  const isLastStep = step === STEPS.length - 1;
  const { Icon: StepIcon, skippable } = STEPS[step];

  return (
    <div className="step-page">
      <div className="glass-container step-card-full" style={{ padding: '24px' }}>
        <StepBar step={step} onExpertMode={onExpertMode} />

        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '18px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <StepIcon size={20} className="gradient-text" />
          {STEPS[step].label}
          {skippable && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, background: 'var(--bg-inset)', padding: '2px 8px', borderRadius: '50px', border: '1px solid var(--glass-border)' }}>
              isteğe bağlı
            </span>
          )}
        </h2>

        {stepRenderers[step]()}

        {error && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px' }}>{error}</p>}
      </div>

      <div className="step-card-full" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary" onClick={goBack} disabled={step === 0} style={{ padding: '12px 20px' }}>
          <ArrowLeft size={16} /> Geri
        </button>
        <div style={{ display: 'flex', gap: '10px' }}>
          {skippable && (
            <button type="button" className="btn btn-secondary" onClick={skip} style={{ padding: '12px 20px' }}>
              Atla →
            </button>
          )}
          {isLastStep ? (
            <button type="button" className="btn btn-primary pulse-glow" onClick={onNext} style={{ padding: '12px 28px', fontSize: '15px' }}>
              Yorumları Yükle <ArrowRight size={18} />
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={goNext} style={{ padding: '12px 24px' }}>
              Sonraki <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
