import { useMemo, useState } from 'react';
import { track } from '../../analytics';
import {
  applyPreset,
  PRESET_GROUPS,
  PRESETS,
  presetsInGroup,
  searchPresets,
  type PresetGroup,
  type TokenPreset,
} from '../../model/presets';
import type { CardLang } from '../../model/token';
import { useStore } from '../../state/store';
import { ManaIcon, Section } from '../common';

// 最近使ったプリセット（この端末だけの便利機能なので localStorage に置く）
const RECENT_KEY = 'mtg-token:recentPresets';
const RECENT_MAX = 6;
const QUICK_MAX = 12;

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((k) => PRESETS.some((p) => p.key === k)) : [];
  } catch {
    return [];
  }
}

function writeRecent(keys: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(keys));
  } catch {
    // 保存できない環境では覚えないだけ
  }
}

const KIND_SHORT: Record<TokenPreset['kind'], Record<CardLang, string>> = {
  creature: { ja: '', en: '' },
  artifact: { ja: 'アーティファクト', en: 'Artifact' },
  artifactCreature: { ja: 'アーティファクト', en: 'Artifact' },
  enchantment: { ja: 'エンチャント', en: 'Enchantment' },
};

function ColorIcons({ p }: { p: TokenPreset }) {
  return (
    <span className="preset-colors" aria-hidden>
      {p.colors.length === 0 ? <ManaIcon name="C" size={16} /> : p.colors.map((c) => <ManaIcon key={c} name={c} size={16} />)}
    </span>
  );
}

function PresetCard({ p, lang, onPick }: { p: TokenPreset; lang: CardLang; onPick: (p: TokenPreset) => void }) {
  const kind = KIND_SHORT[p.kind][lang];
  const detail = [kind, p.rules?.[lang]].filter(Boolean).join('・');
  return (
    <li>
      <button type="button" className="preset-card" onClick={() => onPick(p)}>
        <span className="preset-top">
          <ColorIcons p={p} />
          <span className="preset-name">{p.name[lang]}</span>
          {p.pt && <span className="preset-pt">{p.pt.join('/')}</span>}
        </span>
        <span className="preset-detail">{detail || (lang === 'ja' ? '能力なし' : 'No abilities')}</span>
      </button>
    </li>
  );
}

export function PresetSection() {
  const lang = useStore((s) => s.token.lang);
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<PresetGroup>('popular');
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState(readRecent);

  const searching = query.trim() !== '';
  const items = useMemo(() => (searching ? searchPresets(query) : presetsInGroup(group)), [searching, query, group]);

  // 閉じているときは「最近使ったもの → 定番」の順に最大12個だけ並べる
  const quick = useMemo(() => {
    const recentPresets = recent.map((k) => PRESETS.find((p) => p.key === k)!);
    const rest = presetsInGroup('popular').filter((p) => !recent.includes(p.key));
    return [...recentPresets, ...rest].slice(0, QUICK_MAX);
  }, [recent]);

  const pick = (p: TokenPreset) => {
    const { token, update, setToken, showToast } = useStore.getState();
    const before = token;
    update(applyPreset(p, token.lang));
    track('select_preset', { preset: p.key });
    const next = [p.key, ...recent.filter((k) => k !== p.key)].slice(0, RECENT_MAX);
    setRecent(next);
    writeRecent(next);
    setOpen(false);
    setQuery('');
    showToast(`「${p.name[token.lang]}」のプリセットを適用しました`, { label: '元に戻す', run: () => setToken(before) });
  };

  return (
    <Section
      title="プリセット"
      aside={
        <button type="button" className="btn small" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? '閉じる' : `一覧から選ぶ（${PRESETS.length}種類）`}
        </button>
      }
    >
      {!open ? (
        <div className="field">
          <span className="field-label">{recent.length > 0 ? '最近使ったもの・定番' : '定番'}</span>
          <div className="chips quick-presets">
            {quick.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`chip preset-chip ${recent.includes(p.key) ? 'recent' : ''}`}
                onClick={() => pick(p)}
              >
                <ColorIcons p={p} />
                {p.name[lang]}
                {p.pt && <span className="preset-pt">{p.pt.join('/')}</span>}
              </button>
            ))}
          </div>
          <span className="field-hint">選ぶと名前・タイプ・色・P/T・能力が置き換わります（イラストはそのまま）</span>
        </div>
      ) : (
        <>
          <input
            type="search"
            className="preset-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="検索（例：飛行、ぞんび、treasure、黒 2/2）"
            aria-label="プリセットを検索"
            // スマホでは開いた瞬間にキーボードが出ないよう、マウス操作の端末だけ自動で入力欄を選ぶ
            autoFocus={window.matchMedia?.('(pointer: fine)').matches}
          />
          <div className={`preset-groups ${searching ? 'dimmed' : ''}`} role="tablist" aria-label="分類">
            {PRESET_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={!searching && group === g.id}
                className={!searching && group === g.id ? 'on' : ''}
                onClick={() => {
                  setGroup(g.id);
                  setQuery('');
                }}
              >
                {g.label}
                <span className="count">{presetsInGroup(g.id).length}</span>
              </button>
            ))}
          </div>
          {items.length > 0 ? (
            <ul className="preset-grid">
              {items.map((p) => (
                <PresetCard key={p.key} p={p} lang={lang} onPick={pick} />
              ))}
            </ul>
          ) : (
            <p className="hint">「{query}」に当てはまるプリセットはありません。</p>
          )}
        </>
      )}
    </Section>
  );
}
