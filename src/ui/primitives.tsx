import type { ReactNode } from 'react';

/** Coloured status pill. Remounts (and replays its flash) whenever the label changes. */
export function Badge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span key={String(children)} className="badge" style={{ '--badge': color } as React.CSSProperties}>
      {children}
    </span>
  );
}

export function Meter({ value, color = 'var(--amber)' }: { value: number; color?: string }) {
  return (
    <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <div className="meter__fill" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }} />
    </div>
  );
}

const ICONS = {
  truck: 'M3 7h11v9H3zM14 10h4l3 3v3h-7zM6.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  forklift: 'M4 9h7v7H4zM11 12h3M15 4v14M15 18h6M7 9V5h4v4M6.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  dock: 'M3 21V9l9-5 9 5v12M7 21v-8h10v8M7 16h10',
  box: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  rack: 'M4 3v18M20 3v18M4 8h16M4 14h16M4 20h16',
  site: 'M3 21V10l9-6 9 6v11zM8 21v-6h8v6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  alert: 'M12 3l10 18H2zM12 10v5M12 18v.01',
  close: 'M6 6l12 12M18 6L6 18',
  map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15',
  reset: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  chevron: 'M6 9l6 6 6-6',
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}
