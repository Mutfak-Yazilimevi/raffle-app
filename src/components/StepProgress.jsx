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
              background: isActive ? 'rgba(225, 48, 108, 0.12)' : isDone ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.03)',
              color: isActive ? 'white' : isDone ? '#10b981' : 'var(--text-muted)',
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
