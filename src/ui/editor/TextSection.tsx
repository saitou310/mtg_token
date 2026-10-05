import { useRef } from 'react';
import { appendKeyword, KEYWORDS } from '../../model/presets';
import type { CardLang } from '../../model/token';
import type { SymbolName } from '../../render/text/parse';
import { useStore } from '../../state/store';
import { Field, ManaIcon, Section, Segmented, Toggle } from '../common';

const TYPE_HEADS: Record<CardLang, string[]> = {
  ja: ['トークン・クリーチャー', 'トークン・アーティファクト', 'トークン・アーティファクト・クリーチャー', 'トークン・エンチャント', 'トークン・エンチャント・クリーチャー'],
  en: ['Token Creature', 'Token Artifact', 'Token Artifact Creature', 'Token Enchantment', 'Token Enchantment Creature'],
};

const INSERT_SYMBOLS: SymbolName[] = ['T', 'Q', 'W', 'U', 'B', 'R', 'G', 'C', 'X', '1', '2', '3', '4', 'E'];

const DASH = ' — ';

export function TextSection() {
  const t = useStore((s) => s.token);
  const update = useStore((s) => s.update);
  const rulesRef = useRef<HTMLTextAreaElement>(null);

  const setTypeHead = (head: string) => {
    const i = t.typeLine.indexOf('—');
    const sub = i >= 0 ? t.typeLine.slice(i + 1).trim() : '';
    update({ typeLine: sub ? `${head}${DASH}${sub}` : head });
  };

  const insertAtCursor = (text: string) => {
    const el = rulesRef.current;
    const start = el?.selectionStart ?? t.rules.length;
    const end = el?.selectionEnd ?? t.rules.length;
    const rules = t.rules.slice(0, start) + text + t.rules.slice(end);
    update({ rules });
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    });
  };

  return (
    <Section
      title="名前・能力"
      aside={
        <Segmented<CardLang>
          ariaLabel="カードの言語"
          value={t.lang}
          onChange={(lang) => update({ lang })}
          options={[
            { value: 'ja', label: '日本語' },
            { value: 'en', label: 'English' },
          ]}
        />
      }
    >
      <Field label="トークン名">
        <input type="text" value={t.name} onChange={(e) => update({ name: e.target.value })} placeholder="例：ゴブリン" />
      </Field>

      <Field label="タイプ行">
        <input type="text" value={t.typeLine} onChange={(e) => update({ typeLine: e.target.value })} />
      </Field>
      <div className="chips" aria-label="タイプの種類">
        {TYPE_HEADS[t.lang].map((h) => (
          <button key={h} type="button" className="chip" onClick={() => setTypeHead(h)}>
            {h.replace(/^トークン・|^Token /, '')}
          </button>
        ))}
      </div>

      <div className="row gap align-end">
        <Toggle checked={t.showPT} onChange={(v) => update({ showPT: v })} label="P/T" />
        <input
          className="pt-input"
          aria-label="パワー"
          value={t.power}
          disabled={!t.showPT}
          onChange={(e) => update({ power: e.target.value })}
        />
        <span className="pt-slash">/</span>
        <input
          className="pt-input"
          aria-label="タフネス"
          value={t.toughness}
          disabled={!t.showPT}
          onChange={(e) => update({ toughness: e.target.value })}
        />
      </div>

      <Field
        label="能力"
        hint={
          <>
            {'{T}'} や {'{2}'}{'{R}'} のように書くと記号になります。括弧（ ）内は注釈文として扱います。
          </>
        }
      >
        <textarea
          ref={rulesRef}
          rows={4}
          value={t.rules}
          onChange={(e) => update({ rules: e.target.value })}
          placeholder={t.lang === 'ja' ? '例：飛行\nこのクリーチャーが攻撃するたび、…' : 'e.g. Flying'}
        />
      </Field>
      <div className="chips" aria-label="キーワード能力">
        {KEYWORDS.map((k) => (
          <button key={k.en} type="button" className="chip" onClick={() => update({ rules: appendKeyword(t.rules, k, t.lang) })}>
            {k[t.lang]}
          </button>
        ))}
      </div>
      <div className="chips symbols" aria-label="記号を挿入">
        {INSERT_SYMBOLS.map((s) => (
          <button key={s} type="button" className="chip icon" onClick={() => insertAtCursor(`{${s}}`)} title={`{${s}} を挿入`}>
            <ManaIcon name={s} size={20} />
          </button>
        ))}
      </div>

      <Field label="フレーバーテキスト（任意）">
        <textarea rows={2} value={t.flavor} onChange={(e) => update({ flavor: e.target.value })} />
      </Field>
    </Section>
  );
}
