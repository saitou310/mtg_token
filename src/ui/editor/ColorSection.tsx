import {
  canonicalOrder,
  MANA_COLORS,
  PALETTE_KEYS,
  PALETTES,
  PART_LABELS,
  resolvePartColors,
  type FrameStyle,
  type PaletteKey,
  type PartColors,
} from '../../model/colors';
import { useStore } from '../../state/store';
import { ManaIcon, Section, Segmented, Swatch, Toggle } from '../common';

function describe(colors: number, artifact: boolean, land: boolean, style: FrameStyle): string {
  if (style === 'custom') return '部位ごとに色を指定しています（各部位 最大3色、選んだ順に左→右）';
  const base = land ? '土地枠' : artifact ? 'アーティファクト枠' : null;
  if (colors === 0) return base ? `${base}` : '無色の枠';
  if (style === 'hybrid' && colors >= 2) return base ? `${base}＋縁取り・帯を${colors}色グラデーション` : `枠全体を${Math.min(3, colors)}色の左右グラデーション`;
  if (base) return `${base}＋${colors <= 2 ? '色付きの縁取り' : 'ゴールドの縁取り'}`;
  if (colors === 1) return '単色の枠';
  if (colors === 2) return 'ゴールド枠＋2色の縁取り（本物の多色カードと同じ）';
  return 'ゴールド枠（3色以上）';
}

export function ColorSection() {
  const t = useStore((s) => s.token);
  const update = useStore((s) => s.update);

  const toggleColor = (c: (typeof MANA_COLORS)[number]) => {
    const has = t.colors.includes(c);
    update({ colors: canonicalOrder(has ? t.colors.filter((x) => x !== c) : [...t.colors, c]) });
  };

  const setStyle = (frameStyle: FrameStyle) => {
    if (frameStyle === 'custom' && t.frameStyle !== 'custom') {
      // 直前の見た目からカスタムを始める
      update({ frameStyle, customColors: resolvePartColors(t) });
    } else {
      update({ frameStyle });
    }
  };

  const togglePart = (part: keyof PartColors, k: PaletteKey) => {
    const cur = t.customColors[part];
    let next = cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k].slice(-3);
    if (next.length === 0) next = [k];
    update({ customColors: { ...t.customColors, [part]: next } });
  };

  return (
    <Section title="色と枠">
      <div className="mana-row" role="group" aria-label="色">
        {MANA_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`mana-toggle ${t.colors.includes(c) ? 'on' : ''}`}
            aria-pressed={t.colors.includes(c)}
            onClick={() => toggleColor(c)}
            title={PALETTES[c].label}
          >
            <ManaIcon name={c} size={30} />
            <span>{PALETTES[c].label}</span>
          </button>
        ))}
      </div>
      <div className="row wrap gap">
        <Toggle checked={t.isArtifact} onChange={(v) => update({ isArtifact: v, isLand: v ? false : t.isLand })} label="アーティファクト枠" />
        <Toggle checked={t.isLand} onChange={(v) => update({ isLand: v, isArtifact: v ? false : t.isArtifact })} label="土地枠" />
      </div>

      <div className="field">
        <span className="field-label">枠のスタイル</span>
        <Segmented<FrameStyle>
          ariaLabel="枠のスタイル"
          value={t.frameStyle}
          onChange={setStyle}
          options={[
            { value: 'auto', label: '自動（本物準拠）' },
            { value: 'hybrid', label: 'ハイブリッド' },
            { value: 'custom', label: 'カスタム' },
          ]}
        />
        <span className="field-hint">{describe(t.colors.length, t.isArtifact, t.isLand, t.frameStyle)}</span>
      </div>

      {t.frameStyle === 'custom' && (
        <div className="custom-parts">
          {(Object.keys(PART_LABELS) as (keyof PartColors)[]).map((part) => (
            <div key={part} className="part-row">
              <span className="part-label">{PART_LABELS[part]}</span>
              <div className="part-chips">
                {PALETTE_KEYS.map((k) => {
                  const idx = t.customColors[part].indexOf(k);
                  return (
                    <button
                      key={k}
                      type="button"
                      className={`chip-color ${idx >= 0 ? 'on' : ''}`}
                      aria-pressed={idx >= 0}
                      onClick={() => togglePart(part, k)}
                      title={PALETTES[k].label}
                    >
                      <Swatch k={k} size={18} />
                      {idx >= 0 && t.customColors[part].length > 1 && <span className="chip-order">{idx + 1}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Toggle checked={t.fullArt} onChange={(v) => update({ fullArt: v })} label="フルアート（イラストを枠いっぱいに）" />
    </Section>
  );
}
