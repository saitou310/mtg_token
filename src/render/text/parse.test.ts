import { describe, expect, it } from 'vitest';
import { parseCardText, parseRuns } from './parse';

describe('parseRuns', () => {
  it('記号と文字列に分ける', () => {
    expect(parseRuns('{T}, Sacrifice: Add {G}.')).toEqual([
      { kind: 'symbol', name: 'T' },
      { kind: 'text', text: ', Sacrifice: Add ', italic: false },
      { kind: 'symbol', name: 'G' },
      { kind: 'text', text: '.', italic: false },
    ]);
  });
  it('小文字や別名も記号として扱う', () => {
    expect(parseRuns('{t}{untap}{12}')).toEqual([
      { kind: 'symbol', name: 'T' },
      { kind: 'symbol', name: 'Q' },
      { kind: 'symbol', name: '12' },
    ]);
  });
  it('未知の記号は文字のまま', () => {
    expect(parseRuns('{foo}')).toEqual([{ kind: 'text', text: '{foo}', italic: false }]);
  });
  it('括弧内は注釈文（斜体）', () => {
    expect(parseRuns('飛行（このクリーチャーは飛ぶ。）')).toEqual([
      { kind: 'text', text: '飛行', italic: false },
      { kind: 'text', text: '（このクリーチャーは飛ぶ。）', italic: true },
    ]);
  });
});

describe('parseCardText', () => {
  it('空行は除き、フレーバーは斜体の段落になる', () => {
    const paras = parseCardText('飛行\n\n警戒', 'こんにちは');
    expect(paras.map((p) => p.flavor)).toEqual([false, false, true]);
    expect(paras[2].runs[0]).toMatchObject({ italic: true });
  });
  it('日本語版では注釈文を斜体にしない', () => {
    const [p] = parseCardText('飛行（説明）', '', false);
    expect(p.runs.every((r) => r.kind !== 'text' || !r.italic)).toBe(true);
  });
});
