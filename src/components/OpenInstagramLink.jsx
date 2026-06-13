import { ExternalLink } from 'lucide-react';
import { resolveInstagramUrl } from '../config';

const INSTA_BORDER = 'rgba(225, 48, 108, 0.3)';

export default function OpenInstagramLink({
  postUrl,
  size = 'default',
  showIcon = false,
  className = '',
  style,
  children = "Instagram\u2019ı Aç",
}) {
  const compact = size === 'compact';

  return (
    <a
      href={resolveInstagramUrl(postUrl)}
      target="_blank"
      rel="noopener noreferrer"
      className={`btn btn-secondary ${className}`.trim()}
      style={{
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '6px' : '8px',
        borderColor: INSTA_BORDER,
        ...(compact ? { padding: '6px 12px', fontSize: '12px' } : null),
        ...style,
      }}
    >
      {showIcon && <ExternalLink size={compact ? 14 : 16} />}
      {children}
    </a>
  );
}
