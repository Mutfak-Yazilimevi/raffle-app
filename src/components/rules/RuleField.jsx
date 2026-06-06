import React from 'react';

export function RuleHelpText({ children }) {
  return <p className="rule-help">{children}</p>;
}

export function RuleEffectBox({ children, title = 'Bu ayar kullanıldığında', flush = false }) {
  return (
    <div className={`rule-effect-box${flush ? ' rule-effect-box--flush' : ''}`} role="note">
      <span className="rule-effect-box__title">{title}</span>
      <p className="rule-effect-box__body">{children}</p>
    </div>
  );
}

export function FormFieldHelp({ children, whenActive, active = true }) {
  return (
    <span className="form-field-help">
      {children}
      {whenActive && active && (
        <span className="form-field-help__when">{whenActive}</span>
      )}
    </span>
  );
}

export function CriteriaCheckbox({
  id,
  checked,
  onChange,
  label,
  description,
  whenEnabled,
  highlighted = false,
  className = '',
}) {
  return (
    <div className={`rule-checkbox-block ${className}`.trim()}>
      <div className={`rule-checkbox-row${highlighted ? ' rule-checkbox-row--card' : ''}`}>
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="rule-checkbox-input"
        />
        <label htmlFor={id} className="rule-checkbox-label">
          <strong>{label}</strong>
          {description && <span className="rule-checkbox-desc">{description}</span>}
        </label>
      </div>
      {checked && whenEnabled && <RuleEffectBox flush={highlighted}>{whenEnabled}</RuleEffectBox>}
    </div>
  );
}

export function RuleOptionHelp({ children, whenSelected, selected = false }) {
  return (
    <div className="rule-option-help-wrap">
      <p className="rule-help">{children}</p>
      {whenSelected && selected && (
        <RuleEffectBox title="Seçili modda">{whenSelected}</RuleEffectBox>
      )}
    </div>
  );
}

export function RuleSection({ title, intro, first = false, children }) {
  return (
    <>
      {!first && <div className="rule-section-divider" />}
      {title && <h4 className="rule-section-heading">{title}</h4>}
      {intro && <p className="rule-section-intro">{intro}</p>}
      {children}
    </>
  );
}

export function RuleToggleGroup({ value, onChange, options, compact = false }) {
  return (
    <div className="rule-toggle-grid">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`btn rule-toggle-btn${compact ? ' rule-toggle-btn--compact' : ''} ${value === option.value ? 'btn-primary' : 'btn-secondary'}`}
          disabled={option.disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function RuleNumberField({
  label,
  help,
  whenActive,
  error,
  className = '',
  inputClassName = 'form-input',
  ...inputProps
}) {
  return (
    <div className={`form-group ${className}`.trim()}>
      <label className="form-label">{label}</label>
      {help && <FormFieldHelp whenActive={whenActive}>{help}</FormFieldHelp>}
      <input className={inputClassName} {...inputProps} />
      {error && <span className="rule-field-error">{error}</span>}
    </div>
  );
}
