'use client';
import {useState} from 'react';

export type AtmosphereMode = 'royal' | 'sakura' | 'starlight' | 'crimson';

const ATMOSPHERES: { id: AtmosphereMode; label: string }[] = [
  { id: 'royal', label: 'Ánh vàng' },
  { id: 'sakura', label: 'Hoa đào' },
  { id: 'starlight', label: 'Ánh sao' },
  { id: 'crimson', label: 'Song hỷ' },
];

function BarIcon({ kind }: { kind: 'fireworks' | 'petals' | 'heart' | 'sparkle' | 'motion' }) {
  switch (kind) {
    case 'fireworks':
      return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>;
    case 'petals':
      return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22c4-4 6-8 6-12a6 6 0 0 0-12 0c0 4 2 8 6 12Z"/><path d="M12 10v12"/></svg>;
    case 'heart':
      return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>;
    case 'motion':
      return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/></svg>;
    default:
      return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4L12 3Z"/></svg>;
  }
}

/**
 * Thanh tương tác chúc phúc thanh lịch:
 * Cho phép khách mời bắn pháo hoa, tung cánh hoa, thả tim, đổi sắc thái không khí hoặc tắt hiệu ứng chuyển động.
 */
export function CelebrationBar({
  atmosphere,
  onAtmosphereChange,
  effectsEnabled = true,
  onToggleEffects,
}: {
  atmosphere: AtmosphereMode;
  onAtmosphereChange: (mode: AtmosphereMode) => void;
  effectsEnabled?: boolean;
  onToggleEffects?: () => void;
}) {
  const [heartsSent, setHeartsSent] = useState(0);
  const [activeBurst, setActiveBurst] = useState<'fireworks' | 'petals' | 'hearts' | null>(null);

  function trigger(eventName: string, kind: 'fireworks' | 'petals' | 'hearts') {
    if (!effectsEnabled && onToggleEffects) {
      onToggleEffects();
    }
    if (typeof window !== 'undefined') {
      window.setTimeout(() => window.dispatchEvent(new CustomEvent(eventName)), effectsEnabled ? 0 : 40);
    }
    if (kind === 'hearts') {
      setHeartsSent(value => value + 1);
    }
    setActiveBurst(kind);
    window.setTimeout(() => setActiveBurst(current => (current === kind ? null : current)), 700);
  }

  function nextAtmosphere() {
    const currentIndex = ATMOSPHERES.findIndex(item => item.id === atmosphere);
    const next = ATMOSPHERES[(currentIndex + 1) % ATMOSPHERES.length];
    onAtmosphereChange(next.id);
    if (effectsEnabled && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wedding:petals'));
    }
  }

  const currentAtmosphere = ATMOSPHERES.find(item => item.id === atmosphere) ?? ATMOSPHERES[0];

  return (
    <aside className="celebration-interactive-bar" aria-label="Hiệu ứng chúc phúc tương tác">
      <div className="celebration-bar-actions">
        <button
          type="button"
          className={`celebration-action-btn${activeBurst === 'fireworks' ? ' is-bursting' : ''}`}
          onClick={() => trigger('wedding:fireworks', 'fireworks')}
        >
          <span className="celebration-btn-icon" aria-hidden="true"><BarIcon kind="fireworks"/></span>
          <span className="celebration-btn-text">Pháo hoa</span>
        </button>
        <button
          type="button"
          className={`celebration-action-btn${activeBurst === 'petals' ? ' is-bursting' : ''}`}
          onClick={() => trigger('wedding:petals', 'petals')}
        >
          <span className="celebration-btn-icon" aria-hidden="true"><BarIcon kind="petals"/></span>
          <span className="celebration-btn-text">Mưa hoa</span>
        </button>
        <button
          type="button"
          className={`celebration-action-btn${activeBurst === 'hearts' ? ' is-bursting' : ''}`}
          onClick={() => trigger('wedding:hearts', 'hearts')}
        >
          <span className="celebration-btn-icon" aria-hidden="true"><BarIcon kind="heart"/></span>
          <span className="celebration-btn-text">{heartsSent > 0 ? `Thả tim (${heartsSent})` : 'Thả tim'}</span>
        </button>
        <button
          type="button"
          className="celebration-action-btn celebration-mode-btn"
          onClick={nextAtmosphere}
          aria-label={`Đổi không khí thiệp: ${currentAtmosphere.label}`}
        >
          <span className="celebration-btn-icon" aria-hidden="true"><BarIcon kind="sparkle"/></span>
          <span className="celebration-btn-text">Không khí: {currentAtmosphere.label}</span>
        </button>
        {onToggleEffects && (
          <button
            type="button"
            className="celebration-action-btn celebration-toggle-btn"
            aria-pressed={effectsEnabled}
            onClick={onToggleEffects}
          >
            <span className="celebration-btn-icon" aria-hidden="true"><BarIcon kind="motion"/></span>
            <span className="celebration-btn-text">{effectsEnabled ? 'Tắt hiệu ứng' : 'Bật hiệu ứng'}</span>
          </button>
        )}
      </div>
    </aside>
  );
}
