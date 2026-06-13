import { COMMENT_BASELINE, ENTRY_METHOD_HELP, ENTRY_METHOD_OPTIONS } from '../../constants/ruleHelpCopy';
import {
  FormFieldHelp,
  RuleBaselineCard,
  RuleOptionHelp,
  RuleToggleGroup,
} from './RuleField';

export default function EntryMethodSection({
  entryMethod,
  setEntryMethod,
  weightedEntry,
  setWeightedEntry,
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
      <RuleBaselineCard>
        {COMMENT_BASELINE}
      </RuleBaselineCard>

      <div className="form-group rule-entry-method">
        <label className="form-label">Katılım hak tipi</label>
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
    </>
  );
}
