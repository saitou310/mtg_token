import { describe, expect, it } from 'vitest';
import { DEFAULT_TEXT_STYLE, fitText, isCJK, layoutText, type MeasureFn } from './layout';
import { parseCardText } from './parse';

/** 和文は全角1文字 = fontSize、欧文は半角 = 0.5 * fontSize として測る */
const measure: MeasureFn = (text, _italic, size) => [...text].reduce((w, ch) => w + (isCJK(ch) ? size : size * 0.5), 0);

const style = { ...DEFAULT_TEXT_STYLE, fontSize: 10 };
const lineText = (l: ReturnType<typeof layoutText>['lines'][number]) =>
  l.items.map((i) => (i.kind === 'text' ? i.text : `{${i.name}}`)).join('');

describe('layoutText', () => {
  it('和文は文字単位で折り返す', () => {
    const r = layoutText(parseCardText('あいうえおかきくけこ', ''), 50, style, measure);
    expect(r.lines.map(lineText)).toEqual(['あいうえお', 'かきくけこ']);
  });

  it('句読点は行頭に来ない（前の行にぶら下げる）', () => {
    const r = layoutText(parseCardText('あいうえお。かきく', ''), 50, style, measure);
    expect(r.lines.map(lineText)).toEqual(['あいうえ', 'お。かきく']);
  });

  it('開き括弧は行末に残さない', () => {
    const r = layoutText(parseCardText('あいうえ「おか」', ''), 50, style, measure);
    expect(lineText(r.lines[0])).toBe('あいうえ');
    expect(lineText(r.lines[1]).startsWith('「')).toBe(true);
  });

  it('欧文は単語単位で折り返し、行末の空白は捨てる', () => {
    // "Draw a card" = 11文字 × 5 = 55
    const r = layoutText(parseCardText('Draw a card now', ''), 56, style, measure);
    expect(r.lines.map(lineText)).toEqual(['Draw a card', 'now']);
    const narrow = layoutText(parseCardText('Draw a card now', ''), 50, style, measure);
    expect(narrow.lines.map(lineText)).toEqual(['Draw a', 'card now']);
  });

  it('記号と直後の句読点・連続記号は分けない', () => {
    const r = layoutText(parseCardText('あいう{2}{W}：え', ''), 45, style, measure);
    // {2}{W}： は一塊なので2行目に送られる
    expect(lineText(r.lines[0])).toBe('あいう');
    expect(lineText(r.lines[1]).startsWith('{2}{W}：')).toBe(true);
  });

  it('フレーバーの前に区切り線の位置を返す', () => {
    const r = layoutText(parseCardText('飛行', 'ことば'), 200, style, measure);
    expect(r.dividerY).not.toBeNull();
    expect(r.lines[1].flavor).toBe(true);
    expect(r.dividerY!).toBeGreaterThan(r.lines[0].baseline);
    expect(r.dividerY!).toBeLessThan(r.lines[1].baseline);
  });
});

describe('fitText', () => {
  it('高さに収まるまで文字を小さくする', () => {
    const paras = parseCardText('あ'.repeat(60), '');
    const big = layoutText(paras, 100, style, measure);
    const fit = fitText(paras, 100, big.height / 2, style, measure, 4);
    expect(fit.fontSize).toBeLessThan(style.fontSize);
    expect(fit.height).toBeLessThanOrEqual(big.height / 2);
  });
  it('最小サイズより小さくはしない', () => {
    const fit = fitText(parseCardText('あ'.repeat(500), ''), 100, 10, style, measure, 6);
    expect(fit.fontSize).toBe(6);
  });
});
