import { describe, expect, it } from 'vitest';
import { mmToPx } from '../render/units';
import { DEFAULT_PRINT, paginate, sheetLayout, SHEETS, type SheetFormat } from './layouts';

const formats: SheetFormat[] = ['a4', 'l', '2l'];

describe('sheetLayout', () => {
  it.each(formats)('%s: カードは 63×88mm で、塗り足し・トンボ込みで用紙に収まる', (f) => {
    const s = { ...DEFAULT_PRINT, bleed: 2 };
    const l = sheetLayout(f, s);
    expect(l.cardW).toBeCloseTo(63);
    expect(l.cardH).toBeCloseTo(88);
    expect(l.slots).toHaveLength(SHEETS[f].perSheet);
    for (const sl of l.slots) {
      expect(sl.x - s.bleed).toBeGreaterThanOrEqual(0);
      expect(sl.y - s.bleed).toBeGreaterThanOrEqual(0);
      expect(sl.x + l.cardW + s.bleed).toBeLessThanOrEqual(l.wMm);
      expect(sl.y + l.cardH + s.bleed).toBeLessThanOrEqual(l.hMm);
    }
    for (const [x1, y1, x2, y2] of l.cropMarks) {
      for (const v of [x1, x2]) expect(v).toBeGreaterThanOrEqual(0);
      for (const v of [y1, y2]) expect(v).toBeGreaterThanOrEqual(0);
      for (const v of [x1, x2]) expect(v).toBeLessThanOrEqual(l.wMm);
      for (const v of [y1, y2]) expect(v).toBeLessThanOrEqual(l.hMm);
    }
  });

  it('A4 は 3×3 で隣り合うカードがくっつく（間隔0）', () => {
    const l = sheetLayout('a4', DEFAULT_PRINT);
    expect(l.slots[1].x - l.slots[0].x).toBeCloseTo(63);
    expect(l.slots[3].y - l.slots[0].y).toBeCloseTo(88);
    // 左右中央
    expect(l.slots[0].x).toBeCloseTo((210 - 189) / 2);
    expect(l.ruler?.lengthMm).toBe(100);
  });

  it('A4 で間隔 3mm', () => {
    const l = sheetLayout('a4', { ...DEFAULT_PRINT, gap: 3 });
    expect(l.slots[1].x - l.slots[0].x).toBeCloseTo(66);
  });

  it('倍率補正でカードの大きさが変わる', () => {
    const l = sheetLayout('l', { ...DEFAULT_PRINT, scale: 0.98 });
    expect(l.cardW).toBeCloseTo(61.74);
    expect(l.cardH).toBeCloseTo(86.24);
  });

  it('定規はトンボと重ならない', () => {
    for (const f of formats) {
      const l = sheetLayout(f, DEFAULT_PRINT);
      if (!l.ruler) continue;
      const lowest = Math.max(...l.cropMarks.map(([, y1, , y2]) => Math.max(y1, y2)));
      expect(l.ruler.y - 2.6).toBeGreaterThan(lowest);
    }
  });

  it('使う枠だけにトンボを付ける', () => {
    const full = sheetLayout('a4', DEFAULT_PRINT);
    const one = sheetLayout('a4', DEFAULT_PRINT, 1);
    expect(one.cropMarks.length).toBeLessThan(full.cropMarks.length);
    const maxX = Math.max(...one.cropMarks.map(([x1, , x2]) => Math.max(x1, x2)));
    expect(maxX).toBeLessThan(one.slots[1].x + 63);
  });
});

describe('写真プリントの画素数', () => {
  it('L判 300dpi は 1051×1500px（L判の縦横比と一致）', () => {
    expect(Math.round(mmToPx(89, 300))).toBe(1051);
    expect(Math.round(mmToPx(127, 300))).toBe(1500);
  });
});

describe('paginate', () => {
  it('枚数を展開して用紙ごとに分ける', () => {
    const pages = paginate(
      [
        { item: 'a', count: 5 },
        { item: 'b', count: 6 },
      ],
      9,
    );
    expect(pages.map((p) => p.length)).toEqual([9, 2]);
    expect(pages[0].filter((x) => x === 'b')).toHaveLength(4);
  });
});
