const STEPS = [
  { id: 'config', label: '1. Kurallar' },
  { id: 'comments', label: '2. Yorumlar' },
  { id: 'draw', label: '3. Çekiliş' },
];

export default function StepProgress({ currentStep }) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      {STEPS.map((step, index) => {
        const isActive = step.id === currentStep;
        const isDone = currentIndex > index;
        return (
          <div
            key={step.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '50px',
              border: '1px solid',
              borderColor: isActive ? 'var(--insta-pink)' : isDone ? 'rgba(16, 185, 129, 0.4)' : 'var(--glass-border)',
              background: isActive ? 'rgba(219, 39, 119, 0.12)' : isDone ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-inset)',
              color: isActive ? 'var(--insta-pink)' : isDone ? '#059669' : 'var(--text-muted)',
              fontWeight: isActive ? 700 : 500,
            }}
          >
            {step.label}
          </div>
        );
      })}
    </div>
  );
}
