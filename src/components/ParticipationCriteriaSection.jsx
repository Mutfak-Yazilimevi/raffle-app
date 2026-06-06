import React from 'react';
import { CRITERIA_COPY, PARTICIPATION_INTRO, SECTION_COPY } from '../constants/ruleHelpCopy';
import {
  CriteriaCheckbox,
  FormFieldHelp,
  MentionRulePanel,
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
    requireLike, setRequireLike,
    requireSave, setRequireSave,
    requireFollowAccounts, setRequireFollowAccounts,
    requiredFollowAccounts, setRequiredFollowAccounts,
    followAccountList,
    requireMentionRule, setRequireMentionRule,
    minMentions, setMinMentions,
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

  const handleMentionRuleToggle = (checked) => {
    setRequireMentionRule(checked);
    if (checked && minMentions === 0) {
      setMinMentions(1);
    }
  };

  return (
    <>
      <p className="rule-section-intro">{PARTICIPATION_INTRO}</p>

      <RuleSection title={SECTION_COPY.basic.title} intro={SECTION_COPY.basic.intro}>
        <CriteriaFromCopy id="requireLike" checked={requireLike} onChange={setRequireLike} />
        <CriteriaFromCopy id="requireSave" checked={requireSave} onChange={setRequireSave} />

        <CriteriaFromCopy
          id="requireFollowAccounts"
          checked={requireFollowAccounts}
          onChange={setRequireFollowAccounts}
        />
        {requireFollowAccounts && (
          <div className="form-group rule-nested-panel">
            <label className="form-label">Takip edilmesi gereken hesaplar</label>
            <FormFieldHelp whenActive="Her satırdaki @kullaniciadi için takip şartı uygulanır. Virgül veya satır sonu ile ayırın. Eklenti «Takip Şartlarını Doğrula» ile profiller kontrol edilir.">
              Katılımcıların takip etmesi gereken marka veya sponsor hesapları.
            </FormFieldHelp>
            <input
              type="text"
              className="form-input"
              placeholder="Örn: @marka_hesabi, @partner1"
              value={requiredFollowAccounts}
              onChange={(e) => setRequiredFollowAccounts(e.target.value)}
            />
            {followAccountList.length > 0 && (
              <FormFieldHelp whenActive={`${followAccountList.length} hesap tanımlandı; eksik takip edenler (doğrulama yapıldıysa) çekiliş dışı kalır.`}>
                Tanınan hesap sayısı: {followAccountList.length}
              </FormFieldHelp>
            )}
          </div>
        )}

        <CriteriaCheckbox
          id="requireMentionRule"
          checked={requireMentionRule}
          onChange={handleMentionRuleToggle}
          label={CRITERIA_COPY.requireMentionRule.label}
          description={CRITERIA_COPY.requireMentionRule.description}
          whenEnabled={CRITERIA_COPY.requireMentionRule.whenEnabled}
        />
        {requireMentionRule && <MentionRulePanel form={form} />}
      </RuleSection>

      <RuleSection title={SECTION_COPY.multiEntry.title} intro={SECTION_COPY.multiEntry.intro}>
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
          help="Spam veya çoklu yorumla haksız avantajı sınırlamak için. 0 bırakılırsa tüm yorumlar değerlendirilir."
          whenActive={maxCommentsPerUser > 0
            ? `Bir kullanıcının ilk ${maxCommentsPerUser} yorumu dikkate alınır; sonrakiler bilet hesabına katılmaz. 0 = sınırsız.`
            : undefined}
          className="form-group--flush"
          type="number"
          min="0"
          value={maxCommentsPerUser}
          onChange={(e) => setMaxCommentsPerUser(Math.max(0, parseInt(e.target.value, 10) || 0))}
          placeholder="0 = sınır yok"
        />
      </RuleSection>

      <RuleSection title={SECTION_COPY.story.title} intro={SECTION_COPY.story.intro}>
        <CriteriaFromCopy id="requireStoryShare" checked={requireStoryShare} onChange={setRequireStoryShare} />
        <CriteriaFromCopy
          id="requireStoryProofIfPrivate"
          checked={requireStoryProofIfPrivate}
          onChange={setRequireStoryProofIfPrivate}
        />
      </RuleSection>

      <RuleSection title={SECTION_COPY.legal.title} intro={SECTION_COPY.legal.intro}>
        <CriteriaFromCopy id="requireMinAge" checked={requireMinAge} onChange={setRequireMinAge} />
        {requireMinAge && (
          <RuleNumberField
            label="Minimum yaş"
            help="Varsayılan 18. Ödül türüne göre 16 veya 21 gibi değerler de girebilirsiniz."
            whenActive={`Katılımcıların en az ${minAge} yaşında olması beklentisi duyurulur; yasal gereklilik ödüle göre değişebilir.`}
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
