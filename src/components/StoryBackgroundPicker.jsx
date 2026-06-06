import { STORY_BACKGROUNDS } from '../utils/storyBackgrounds';

export default function StoryBackgroundPicker({ value, onChange }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label className="form-label" style={{ marginBottom: '6px' }}>Story arka plan tonu</label>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
        Uygulama temasından bağımsızdır; duyuru, çekiliş, talihli ve sonuç story görsellerinde kullanılır.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: '10px' }}>
        {STORY_BACKGROUNDS.map((bg) => {
          const selected = value === bg.id;
          return (
            <button
              key={bg.id}
              type="button"
              onClick={() => onChange(bg.id)}
              title={bg.description}
              aria-pressed={selected}
              style={{
                border: selected ? '2px solid var(--insta-pink)' : '1px solid var(--glass-border)',
                borderRadius: '12px',
                padding: '8px',
                cursor: 'pointer',
                background: 'var(--bg-elevated)',
                boxShadow: selected ? 'var(--shadow-neon-pink)' : 'none',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  height: '44px',
                  borderRadius: '8px',
                  background: `linear-gradient(135deg, ${bg.preview.join(', ')})`,
                  marginBottom: '6px',
                  border: '1px solid rgba(15, 23, 42, 0.06)',
                }}
              />
              <span style={{ fontSize: '11px', fontWeight: selected ? 700 : 500, color: 'var(--text-main)' }}>
                {bg.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
