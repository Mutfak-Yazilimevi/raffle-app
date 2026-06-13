import { CRITERIA_COPY, SECTION_COPY } from '../../constants/ruleHelpCopy';
import {
  CriteriaCheckbox,
  FormFieldHelp,
  RuleGroupPanel,
} from './RuleField';
import MentionRulePanel from './MentionRulePanel';

export default function CommentRulesSection({ form }) {
  const {
    keywordRequired,
    setKeywordRequired,
    keywordBlacklist,
    setKeywordBlacklist,
    userBlacklist,
    setUserBlacklist,
    requireMentionRule,
    setRequireMentionRule,
    minMentions,
    setMinMentions,
  } = form;

  const section = SECTION_COPY.commentRules;

  const handleMentionRuleToggle = (checked) => {
    setRequireMentionRule(checked);
    if (checked && minMentions === 0) {
      setMinMentions(1);
    }
  };

  return (
    <RuleGroupPanel badge={section.badge} title={section.title} intro={section.intro}>
      <div className="form-group">
        <label className="form-label">Zorunlu kelime veya hashtag</label>
        <FormFieldHelp
          whenActive={keywordRequired.trim()
            ? `Yorum metninde «${keywordRequired.trim()}» geçmeyen yorumlar elenir. Büyük/küçük harf fark etmez.`
            : undefined}
        >
          İsteğe bağlı. Boş bırakırsanız yalnızca yorum bırakmak yeterli olur.
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
        <label className="form-label">Yasaklı kelimeler</label>
        <FormFieldHelp whenActive={keywordBlacklist.trim() ? 'Listelenen kelimelerden biri yorumda geçen katılımcılar elenir.' : undefined}>
          Virgülle ayırın. Örn: bot, spam
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
        <label className="form-label">Engellenen katılımcılar</label>
        <FormFieldHelp whenActive={userBlacklist.trim() ? 'Listede olan kullanıcı adlarının tüm yorumları havuza alınmaz.' : undefined}>
          Virgülle ayırın. @ işareti opsiyoneldir.
        </FormFieldHelp>
        <input
          type="text"
          className="form-input"
          placeholder="Örn: @kendi_hesabiniz, @spam_user"
          value={userBlacklist}
          onChange={(e) => setUserBlacklist(e.target.value)}
        />
      </div>

      <div className="rule-subsection-divider" />

      <CriteriaCheckbox
        id="requireMentionRule"
        checked={requireMentionRule}
        onChange={handleMentionRuleToggle}
        label={CRITERIA_COPY.requireMentionRule.label}
        description={CRITERIA_COPY.requireMentionRule.description}
        whenEnabled={CRITERIA_COPY.requireMentionRule.whenEnabled}
      />
      {requireMentionRule && <MentionRulePanel form={form} />}
    </RuleGroupPanel>
  );
}
