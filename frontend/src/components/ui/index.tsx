import type { ReactNode, CSSProperties, ButtonHTMLAttributes } from 'react';

// ─── Card ─────────────────────────────────────────────────────────────────

export function Card({
  children, style, pad = '16px',
}: { children: ReactNode; style?: CSSProperties; pad?: string }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: pad,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{
      fontSize: 10,
      fontWeight: 600,
      color: 'var(--text-lo)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────

type BadgeVariant = 'high' | 'medium' | 'low' | 'info' | 'neutral' | 'success';

const BADGE_STYLES: Record<BadgeVariant, CSSProperties> = {
  high:    { background: 'rgba(217,79,79,0.15)',   color: '#d94f4f' },
  medium:  { background: 'rgba(232,160,32,0.15)',  color: '#e8a020' },
  low:     { background: 'rgba(29,176,130,0.15)',  color: '#1db082' },
  info:    { background: 'rgba(58,143,214,0.15)',  color: '#3a8fd6' },
  neutral: { background: 'rgba(154,152,145,0.15)', color: '#9a9891' },
  success: { background: 'rgba(29,176,130,0.15)',  color: '#1db082' },
};

export function Badge({ variant, children }: { variant: BadgeVariant; children: ReactNode }) {
  return (
    <span style={{
      ...BADGE_STYLES[variant],
      fontSize: 10,
      fontWeight: 600,
      padding: '2px 7px',
      borderRadius: 4,
      letterSpacing: '0.04em',
    }}>
      {children}
    </span>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BTN_STYLES: Record<BtnVariant, CSSProperties> = {
  primary:   { background: 'var(--teal)',    color: '#fff', border: '1px solid transparent' },
  secondary: { background: 'var(--surface2)', color: 'var(--text-hi)', border: '1px solid var(--border2)' },
  ghost:     { background: 'transparent',    color: 'var(--text-md)', border: '1px solid var(--border)' },
  danger:    { background: 'var(--red-lo)',  color: 'var(--red)',     border: '1px solid rgba(217,79,79,0.3)' },
};

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: 'sm' | 'md';
  icon?: ReactNode;
}

export function Btn({
  variant = 'secondary', size = 'md', icon, children, style, ...rest
}: BtnProps) {
  const padding = size === 'sm' ? '5px 10px' : '7px 14px';
  return (
    <button style={{
      ...BTN_STYLES[variant],
      padding,
      borderRadius: 'var(--radius)',
      fontSize: size === 'sm' ? 12 : 13,
      fontWeight: 500,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      transition: 'opacity 0.12s',
      ...style,
    }} {...rest}>
      {icon && <span style={{ display: 'flex' }}>{icon}</span>}
      {children}
    </button>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────

export function Stat({
  label, value, unit, accent,
}: { label: string; value: string | number; unit?: string; accent?: string }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '10px 14px',
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-lo)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: accent ?? 'var(--text-hi)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
        {unit && <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-md)', marginLeft: 4 }}>{unit}</span>}
      </div>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────

export function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 32, height: 18,
        borderRadius: 9,
        background: on ? 'var(--teal)' : 'var(--surface2)',
        border: '1px solid ' + (on ? 'transparent' : 'var(--border2)'),
        position: 'relative',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        width: 12, height: 12,
        borderRadius: '50%',
        background: '#fff',
        top: 2, left: on ? 16 : 2,
        transition: 'left 0.15s',
      }} />
    </button>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────

export function Divider({ margin = '12px 0' }: { margin?: string }) {
  return <div style={{ height: 1, background: 'var(--border)', margin }} />;
}

// ─── Progress bar ─────────────────────────────────────────────────────────

export function ProgressBar({ value, color = 'var(--teal)' }: { value: number; color?: string }) {
  return (
    <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.3s' }} />
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────

export function Row({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
      <span style={{ color: 'var(--text-md)', fontSize: 12 }}>{label}</span>
      <span style={{ color: 'var(--text-hi)', fontSize: 12, fontFamily: mono ? 'monospace' : undefined, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}
