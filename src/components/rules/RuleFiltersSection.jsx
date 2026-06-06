import React from 'react';
import {
  ENTRY_METHOD_HELP,
  ENTRY_METHOD_OPTIONS,
  FILTER_INTRO,
} from '../../constants/ruleHelpCopy';
import {
  FormFieldHelp,
  RuleOptionHelp,
  RuleSection,
  RuleToggleGroup,
} from './RuleField';

export default function RuleFiltersSection({
  entryMethod,
  setEntryMethod,
  weightedEntry,
  setWeightedEntry,
  keywordRequired,
  setKeywordRequired,
  keywordBlacklist,
  setKeywordBlacklist,
  userBlacklist,
  setUserBlacklist,
}) {
  const entryOptions = ENTRY_METHOD_OPTIONS.map((option) => ({
    ...option,
    disabled: option.value === 'one_per_comment' && weightedEntry,
  }));

  const handleEntryMethodChange = (method) => {
    setEntryMethod(method);
    if (method === 'one_per_user') {
      setWeightedEntry(false);
    }
  };

  return (
    <>
      <div className="form-group">
        <label className="form-label">Katılım Hak Tipi</label>
        <FormFieldHelp>{ENTRY_METHOD_HELP}</FormFieldHelp>
        <RuleToggleGroup
          value={entryMethod}
          onChange={handleEntryMethodChange}
          options={entryOptions}
        />
        {ENTRY_METHOD_OPTIONS.map((option) => (
          <RuleOptionHelp
            key={option.value}
            selected={option.value === 'one_per_user'
              ? entryMethod === 'one_per_user' && !weightedEntry
              : entryMethod === option.value}
            whenSelected={option.whenSelected}
          >
            {option.summary}
          </RuleOptionHelp>
        ))}
      </div>

      <RuleSection title="Kelime ve Kullanıcı Filtreleri" intro={FILTER_INTRO}>
        <div className="form-group">
          <label className="form-label">Zorunlu Kelime veya Hashtag (İsteğe Bağlı)</label>
          <FormFieldHelp
            whenActive={keywordRequired.trim()
              ? `Yorum metninde «${keywordRequired.trim()}» geçmeyen yorumlar elenir. Büyük/küçük harf fark etmez.`
              : undefined}
          >
            Katılım için yorumda mutlaka bulunması gereken kelime veya hashtag. Boş bırakırsanız zorunluluk uygulanmaz.
          </FormFieldHelp>
          <input
            type="text"
            className="form-input"
            placeholder="Örn: #cekilis, katılıyorum"
            value={keywordRequired}
            onChange={(e) => setKeywordRequired(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Yasaklı Kelimeler (Virgülle Ayırın)</label>
          <FormFieldHelp whenActive={keywordBlacklist.trim() ? 'Listelenen kelimelerden herhangi biri yorumda geçen katılımcılar otomatik elenir.' : undefined}>
            Yorumda geçmemesi gereken kelimeler. Virgülle ayırın. Örn: bot, spam
          </FormFieldHelp>
          <input
            type="text"
            className="form-input"
            placeholder="Örn: bot, spam, sahte"
            value={keywordBlacklist}
            onChange={(e) => setKeywordBlacklist(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Engellenen Katılımcılar (Virgülle Ayırın)</label>
          <FormFieldHelp whenActive={userBlacklist.trim() ? 'Listede olan kullanıcı adlarının tüm yorumları havuza alınmaz; @ işareti opsiyoneldir.' : undefined}>
            Hiç katılamayacak Instagram kullanıcı adları. Kendi hesabınız veya bilinen spam hesaplar eklenebilir.
          </FormFieldHelp>
          <input
            type="text"
            className="form-input"
            placeholder="Örn: @kendi_hesabiniz, @spam_user"
            value={userBlacklist}
            onChange={(e) => setUserBlacklist(e.target.value)}
          />
        </div>
      </RuleSection>
    </>
  );
}
