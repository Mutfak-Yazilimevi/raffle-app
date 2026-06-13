import { CRITERIA_COPY, SECTION_COPY } from '../../constants/ruleHelpCopy';
import { CriteriaCheckbox, RuleSection } from './RuleField';

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

export default function PostInteractionSection({ form }) {
  const {
    requireComment,
    setRequireComment,
    requireLike,
    setRequireLike,
    requireSave,
    setRequireSave,
  } = form;

  const section = SECTION_COPY.postInteraction;

  return (
    <RuleSection badge={section.badge} title={section.title} intro={section.intro}>
      <CriteriaFromCopy id="requireComment" checked={requireComment} onChange={setRequireComment} />
      <CriteriaFromCopy id="requireLike" checked={requireLike} onChange={setRequireLike} />
      <CriteriaFromCopy id="requireSave" checked={requireSave} onChange={setRequireSave} />
    </RuleSection>
  );
}
