import { CRITERIA_COPY } from '../../constants/ruleHelpCopy';
import { CriteriaCheckbox, FormFieldHelp, RuleSection } from './RuleField';

function CriteriaFromCopy({ id, checked, onChange }) {
  const copy = CRITERIA_COPY[id];
  return (
    <CriteriaCheckbox
      id={id}
      checked={checked}
      onChange={onChange}
      label={copy.label}
      description={copy.description}
      whenEnabled={copy.whenEnabled}
    />
  );
}

export default function PostInteractionSection({ form, first = false }) {
  const {
    requireComment, setRequireComment,
    requireLike, setRequireLike,
    requireSave, setRequireSave,
    requireFollowAccounts, setRequireFollowAccounts,
    requiredFollowAccounts, setRequiredFollowAccounts,
    followAccountList,
  } = form;

  return (
    <RuleSection title="Katılım Koşulları" first={first}>
      <CriteriaFromCopy id="requireComment" checked={requireComment} onChange={setRequireComment} />
      <CriteriaFromCopy id="requireLike" checked={requireLike} onChange={setRequireLike} />
      <CriteriaFromCopy id="requireSave" checked={requireSave} onChange={setRequireSave} />
      <CriteriaFromCopy id="requireFollowAccounts" checked={requireFollowAccounts} onChange={setRequireFollowAccounts} />
      {requireFollowAccounts && (
        <div className="form-group rule-nested-panel">
          <label className="form-label">Takip edilmesi gereken hesaplar</label>
          <FormFieldHelp>Virgül veya satır sonu ile ayırın.</FormFieldHelp>
          <input
            type="text"
            className="form-input"
            placeholder="Örn: @marka_hesabi, @partner1"
            value={requiredFollowAccounts}
            onChange={(e) => setRequiredFollowAccounts(e.target.value)}
          />
          {followAccountList.length > 0 && (
            <FormFieldHelp>Tanınan hesap sayısı: {followAccountList.length}</FormFieldHelp>
          )}
        </div>
      )}
    </RuleSection>
  );
}
