import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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

export function AccountSection({ form, first = false }) {
  const {
    requireFollowAccounts, setRequireFollowAccounts,
    requiredFollowAccounts, setRequiredFollowAccounts,
    followAccountList,
  } = form;

  const { badge, title } = SECTION_COPY.account;

  return (
    <RuleSection badge={badge} title={title} first={first}>
      <CriteriaFromCopy
        id="requireFollowAccounts"
        checked={requireFollowAccounts}
        onChange={setRequireFollowAccounts}
      />
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

export default function ParticipationCriteriaSection({ form }) {
  const {
    requireComment,
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

  const hasAdvanced = requireStoryShare || requireStoryProofIfPrivate || requireMinAge || requireRealActiveAccount || disallowBusinessAccounts;
  const [showAdvanced, setShowAdvanced] = useState(() => hasAdvanced);

  return (
    <>
      {requireComment && (
        <RuleSection title={SECTION_COPY.multiEntry.title}>
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
            className="form-group--flush"
            type="number"
            min="0"
            value={maxCommentsPerUser}
            onChange={(e) => setMaxCommentsPerUser(Math.max(0, parseInt(e.target.value, 10) || 0))}
            placeholder="0 = sınır yok"
          />
        </RuleSection>
      )}

      <div className="rule-section-divider" />
      <button
        type="button"
        style={{ background: 'none', border: 'none', padding: '4px 0', width: '100%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
        onClick={() => setShowAdvanced((v) => !v)}
      >
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
          Hikâye paylaşımı &amp; yasal kriterler
          {hasAdvanced && <span style={{ color: 'var(--insta-pink)', marginLeft: 6 }}>●</span>}
        </span>
        {showAdvanced ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
      </button>

      {showAdvanced && (
        <>
          <RuleSection badge={SECTION_COPY.story.badge} title={SECTION_COPY.story.title}>
            <CriteriaFromCopy id="requireStoryShare" checked={requireStoryShare} onChange={setRequireStoryShare} />
            <CriteriaFromCopy
              id="requireStoryProofIfPrivate"
              checked={requireStoryProofIfPrivate}
              onChange={setRequireStoryProofIfPrivate}
            />
          </RuleSection>

          <RuleSection badge={SECTION_COPY.legal.badge} title={SECTION_COPY.legal.title}>
            <CriteriaFromCopy id="requireMinAge" checked={requireMinAge} onChange={setRequireMinAge} />
            {requireMinAge && (
              <RuleNumberField
                label="Minimum yaş"
                help="Varsayılan 18."
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
      )}
    </>
  );
}
