import { CRITERIA_COPY, SECTION_COPY } from '../constants/ruleHelpCopy';
import {
  CriteriaCheckbox,
  FormFieldHelp,
  RuleNumberField,
  RuleSection,
} from './rules';

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

export default function ParticipationCriteriaSection({ form }) {
  const {
    requireComment,
    requireFollowAccounts, setRequireFollowAccounts,
    requiredFollowAccounts, setRequiredFollowAccounts,
    followAccountList,
    maxCommentsPerUser, setMaxCommentsPerUser,
    allowMultipleCommentsBonus, setAllowMultipleCommentsBonus,
    setEntryMethod,
    requireStoryShare, setRequireStoryShare,
    requireStoryProofIfPrivate, setRequireStoryProofIfPrivate,
    requireMinAge, setRequireMinAge,
    minAge, setMinAge,
    requireRealActiveAccount, setRequireRealActiveAccount,
    disallowBusinessAccounts, setDisallowBusinessAccounts,
  } = form;

  const accountSection = SECTION_COPY.account;

  return (
    <>
      <RuleSection
        badge={accountSection.badge}
        title={accountSection.title}
        intro={accountSection.intro}
      >
        <CriteriaFromCopy
          id="requireFollowAccounts"
          checked={requireFollowAccounts}
          onChange={setRequireFollowAccounts}
        />
        {requireFollowAccounts && (
          <div className="form-group rule-nested-panel">
            <label className="form-label">Takip edilmesi gereken hesaplar</label>
            <FormFieldHelp whenActive="Her @kullaniciadi için takip şartı uygulanır. Eklenti «Takip Şartlarını Doğrula» ile kontrol edilir; eksik takip edenler havuzdan düşer.">
              Virgül veya satır sonu ile ayırın.
            </FormFieldHelp>
            <input
              type="text"
              className="form-input"
              placeholder="Örn: @marka_hesabi, @partner1"
              value={requiredFollowAccounts}
              onChange={(e) => setRequiredFollowAccounts(e.target.value)}
            />
            {followAccountList.length > 0 && (
              <FormFieldHelp whenActive={`${followAccountList.length} hesap tanımlandı.`}>
                Tanınan hesap sayısı: {followAccountList.length}
              </FormFieldHelp>
            )}
          </div>
        )}
      </RuleSection>

      {requireComment && (
      <RuleSection
        title={SECTION_COPY.multiEntry.title}
        intro={SECTION_COPY.multiEntry.intro}
      >
        <CriteriaCheckbox
          id="allowMultipleCommentsBonus"
          checked={allowMultipleCommentsBonus}
          onChange={(checked) => {
            setAllowMultipleCommentsBonus(checked);
            if (checked) setEntryMethod('one_per_comment');
          }}
          label={CRITERIA_COPY.allowMultipleCommentsBonus.label}
          description={CRITERIA_COPY.allowMultipleCommentsBonus.description}
          whenEnabled={CRITERIA_COPY.allowMultipleCommentsBonus.whenEnabled}
        />
        <RuleNumberField
          label="Kişi başına maksimum yorum"
          help="0 bırakılırsa tüm yorumlar değerlendirilir."
          whenActive={maxCommentsPerUser > 0
            ? `Bir kullanıcının ilk ${maxCommentsPerUser} yorumu dikkate alınır; sonrakiler bilet hesabına katılmaz.`
            : undefined}
          className="form-group--flush"
          type="number"
          min="0"
          value={maxCommentsPerUser}
          onChange={(e) => setMaxCommentsPerUser(Math.max(0, parseInt(e.target.value, 10) || 0))}
          placeholder="0 = sınır yok"
        />
      </RuleSection>
      )}

      <RuleSection
        badge={SECTION_COPY.story.badge}
        title={SECTION_COPY.story.title}
        intro={SECTION_COPY.story.intro}
      >
        <CriteriaFromCopy id="requireStoryShare" checked={requireStoryShare} onChange={setRequireStoryShare} />
        <CriteriaFromCopy
          id="requireStoryProofIfPrivate"
          checked={requireStoryProofIfPrivate}
          onChange={setRequireStoryProofIfPrivate}
        />
      </RuleSection>

      <RuleSection
        badge={SECTION_COPY.legal.badge}
        title={SECTION_COPY.legal.title}
        intro={SECTION_COPY.legal.intro}
      >
        <CriteriaFromCopy id="requireMinAge" checked={requireMinAge} onChange={setRequireMinAge} />
        {requireMinAge && (
          <RuleNumberField
            label="Minimum yaş"
            help="Varsayılan 18."
            whenActive={`En az ${minAge} yaş beklentisi duyurulur.`}
            className="rule-nested-panel"
            type="number"
            min="1"
            max="99"
            value={minAge}
            onChange={(e) => setMinAge(Math.max(1, parseInt(e.target.value, 10) || 18))}
          />
        )}
        <CriteriaFromCopy
          id="requireRealActiveAccount"
          checked={requireRealActiveAccount}
          onChange={setRequireRealActiveAccount}
        />
        <CriteriaFromCopy
          id="disallowBusinessAccounts"
          checked={disallowBusinessAccounts}
          onChange={setDisallowBusinessAccounts}
        />
      </RuleSection>
    </>
  );
}
