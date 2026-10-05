import { useId, useMemo, type ReactNode } from 'react';
import { PALETTES, type PaletteKey } from '../model/colors';
import { symbolBackground, symbolSvgPath } from '../render/symbols';
import type { SymbolName } from '../render/text/parse';

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="section">
      <header className="section-head">
        <h2>{title}</h2>
        {aside}
      </header>
      <div className="section-body">{children}</div>
    </section>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  const id = useId();
  return (
    <label className="toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden />
      <span>{label}</span>
    </label>
  );
}

/** UI 用のマナ記号アイコン */
export function ManaIcon({ name, size = 22 }: { name: SymbolName; size?: number }) {
  const d = useMemo(() => symbolSvgPath(name), [name]);
  return (
    <svg width={size} height={size} viewBox="-4.8 -4.8 41.6 41.6" aria-hidden className="mana-icon">
      <circle cx="16" cy="16" r="20.8" fill={symbolBackground(name)} />
      <path d={d} fill="#111" />
    </svg>
  );
}

export function Swatch({ k, size = 16 }: { k: PaletteKey; size?: number }) {
  const p = PALETTES[k];
  return (
    <span
      className="swatch"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${p.frameLight}, ${p.frame} 55%, ${p.frameDark})` }}
      title={p.label}
    />
  );
}

export function Stepper({ value, onChange, min = 1, max = 99 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label="減らす">
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
      />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label="増やす">
        ＋
      </button>
    </div>
  );
}

/** ファイル選択ボタン */
export function FileButton({
  accept,
  onFile,
  children,
  className = 'btn',
}: {
  accept: string;
  onFile: (f: File) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      {children}
      <input
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </label>
  );
}
