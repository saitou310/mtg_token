import { describe, expect, it } from 'vitest';
import { canonicalOrder } from './colors';
import {
  appendKeyword,
  applyPreset,
  colorGroupOf,
  KEYWORDS,
  normalizeForSearch,
  PRESET_GROUPS,
  PRESETS,
  presetsInGroup,
  searchPresets,
} from './presets';

const keys = (ps: { key: string }[]) => ps.map((p) => p.key);

describe('PRESETS', () => {
  it('キーは重複しない', () => {
    expect(new Set(keys(PRESETS)).size).toBe(PRESETS.length);
  });
  it('日本語・英語の名前があり、色は正式な並び', () => {
    for (const p of PRESETS) {
      expect(p.name.ja && p.name.en, p.key).toBeTruthy();
      expect(p.colors, p.key).toEqual(canonicalOrder(p.colors));
      if (p.rules) expect(p.rules.ja && p.rules.en, p.key).toBeTruthy();
    }
  });
  it('クリーチャーには P/T がある', () => {
    for (const p of PRESETS) {
      const creature = p.kind === 'creature' || p.kind === 'artifactCreature';
      expect(!!p.pt, p.key).toBe(creature);
    }
  });
  it('どの分類も空ではなく、定番は選びやすい数に収まっている', () => {
    for (const g of PRESET_GROUPS) expect(presetsInGroup(g.id).length, g.id).toBeGreaterThan(0);
    expect(presetsInGroup('popular').length).toBeLessThanOrEqual(12);
  });
  it('色の分類', () => {
    const byKey = (k: string) => PRESETS.find((p) => p.key === k)!;
    expect(colorGroupOf(byKey('zombie'))).toBe('B');
    expect(colorGroupOf(byKey('pest'))).toBe('multi');
    expect(colorGroupOf(byKey('treasure'))).toBe('colorless');
  });
});

describe('searchPresets', () => {
  it('ひらがなでカタカナの名前を探せる', () => {
    expect(normalizeForSearch('ぞんび')).toBe(normalizeForSearch('ゾンビ'));
    expect(keys(searchPresets('ぞんび'))).toContain('zombie');
  });
  it('英語名・大文字小文字・全角は問わない', () => {
    expect(keys(searchPresets('TREASURE'))).toEqual(['treasure']);
    expect(keys(searchPresets('ｔｒｅａｓｕｒｅ'))).toEqual(['treasure']);
  });
  it('「・」や空白の有無は問わない', () => {
    expect(keys(searchPresets('エルフ戦士'))).toContain('elfWarrior');
  });
  it('能力で探せる', () => {
    const flyers = searchPresets('飛行');
    expect(flyers.length).toBeGreaterThan(5);
    expect(flyers.every((p) => p.rules?.ja.includes('飛行'))).toBe(true);
  });
  it('複数の語はすべて含むものに絞る（色＋P/T）', () => {
    const r = searchPresets('黒 2/2');
    expect(keys(r)).toEqual(expect.arrayContaining(['zombie', 'pirate']));
    expect(r.every((p) => p.colors.includes('B') && p.pt?.join('/') === '2/2')).toBe(true);
  });
  it('空の検索は何も返さない', () => {
    expect(searchPresets('  ')).toEqual([]);
  });
});

const kw = (ja: string) => KEYWORDS.find((k) => k.ja === ja)!;

describe('appendKeyword', () => {
  it('空なら単独で入る', () => {
    expect(appendKeyword('', kw('飛行'), 'ja')).toBe('飛行');
  });
  it('キーワードだけの行には読点でつなぐ', () => {
    expect(appendKeyword('飛行', kw('警戒'), 'ja')).toBe('飛行、警戒');
    expect(appendKeyword('Flying', kw('警戒'), 'en')).toBe('Flying, vigilance');
  });
  it('同じキーワードは重複させない', () => {
    expect(appendKeyword('飛行、警戒', kw('飛行'), 'ja')).toBe('飛行、警戒');
  });
  it('文章の行の後ろには改行して入れる', () => {
    expect(appendKeyword('{T}：カードを1枚引く。', kw('速攻'), 'ja')).toBe('{T}：カードを1枚引く。\n速攻');
  });
});

describe('applyPreset', () => {
  it('アーティファクトは P/T なし', () => {
    const p = applyPreset(PRESETS.find((x) => x.key === 'treasure')!, 'ja');
    expect(p.isArtifact).toBe(true);
    expect(p.showPT).toBe(false);
    expect(p.typeLine).toBe('トークン・アーティファクト — 宝物');
  });
  it('英語版', () => {
    const p = applyPreset(PRESETS.find((x) => x.key === 'thopter')!, 'en');
    expect(p.typeLine).toBe('Token Artifact Creature — Thopter');
    expect(p.rules).toBe('Flying');
  });
});
