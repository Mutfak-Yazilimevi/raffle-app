import { CRITERIA_COPY, MENTION_MODE_OPTIONS } from '../../constants/ruleHelpCopy';
import {
  CriteriaCheckbox,
  FormFieldHelp,
  RuleNumberField,
  RuleOptionHelp,
  RuleToggleGroup,
} from './RuleField';

export default function MentionRulePanel({ form }) {
  const {
    minMentions,
    setMinMentions,
    mentionMode,
    setMentionMode,
    weightedEntry,
    setWeightedEntry,
    uniqueMentions,
    setUniqueMentions,
    maxMentions,
    setMaxMentions,
    setEntryMethod,
  } = form;

  const effectiveMinMentions = minMentions || 1;
  const mentionModeOptions = MENTION_MODE_OPTIONS.map(({ value, label }) => ({ value, label }));

  const handleMentionModeChange = (mode) => {
    setMentionMode(mode);
    if (mode === 'per_comment') {
      setWeightedEntry(false);
    }
  };

  return (
    <div className="rule-nested-panel">
      <RuleNumberField
        label="En az etiket sayısı"
        help="Genelde 1–5 arası verilir. Örn: 3 seçerseniz «3 arkadaş etiketle» kuralı uygulanır."
        whenActive={`Her geçerli yorumda veya kullanıcı toplamında en az ${effectiveMinMentions} farklı @etiket aranır; altında kalanlar elenir.`}
        type="number"
        min="1"
        max="20"
        value={effectiveMinMentions}
        onChange={(e) => setMinMentions(Math.max(1, parseInt(e.target.value, 10) || 1))}
      />

      <div className="form-group">
        <label className="form-label">Etiket kontrol yöntemi</label>
        <FormFieldHelp>
          Etiketlerin her yorumda mı yoksa kullanıcının tüm yorumları toplamında mı sayılacağını belirler.
        </FormFieldHelp>
        <RuleToggleGroup
          value={mentionMode}
          onChange={handleMentionModeChange}
          options={mentionModeOptions}
          compact
        />
        {MENTION_MODE_OPTIONS.map((option) => (
          <RuleOptionHelp
            key={option.value}
            selected={mentionMode === option.value}
            whenSelected={option.whenSelected}
          >
            {option.summary}
          </RuleOptionHelp>
        ))}
      </div>

      {mentionMode === 'cumulative' && (
        <CriteriaCheckbox
          id="weightedEntry"
          checked={weightedEntry}
          onChange={(checked) => {
            setWeightedEntry(checked);
            if (checked) setEntryMethod('one_per_user');
          }}
          label={CRITERIA_COPY.weightedEntry.label}
          description={CRITERIA_COPY.weightedEntry.description}
          whenEnabled={`Toplam benzersiz etiket sayısı ${effectiveMinMentions}'e bölünür; çıkan tam sayı kadar bilet verilir. Örn: 9 etiket ve minimum 3 ise → 3 bilet. Katılım tipi otomatik «Her Kullanıcıya Tek Hak» yerine bilet sayısı artar.`}
        />
      )}

      <CriteriaCheckbox
        id="uniqueMentions"
        checked={uniqueMentions}
        onChange={setUniqueMentions}
        label={CRITERIA_COPY.uniqueMentions.label}
        description={CRITERIA_COPY.uniqueMentions.description}
        whenEnabled="Aynı @kullanici birden fazla yazılsa yalnızca bir kez sayılır. Kendi kullanıcı adını @etiketleyenler sayılmaz."
      />

      <RuleNumberField
        label="En fazla etiket (üst sınır)"
        help="İsteğe bağlı. Spam yorumları (aşırı etiket) engellemek için kullanılır."
        whenActive={maxMentions > 0
          ? `Etiket sayısı ${maxMentions} üzerinde olan yorum veya kullanıcılar elenir. 0 bırakırsanız üst sınır uygulanmaz.`
          : undefined}
        error={maxMentions > 0 && minMentions > 0 && maxMentions < minMentions
          ? 'Üst sınır, en az etiket sayısından küçük olamaz.'
          : undefined}
        className="form-group--flush"
        type="number"
        min="0"
        max="20"
        value={maxMentions}
        onChange={(e) => setMaxMentions(Math.max(0, parseInt(e.target.value, 10) || 0))}
        placeholder="0 = sınır yok"
      />
    </div>
  );
}
