import { describe, expect, it } from 'vitest';
import { canonicalOrder, gradientStops, resolvePartColors, type ColorSpec } from './colors';

const spec = (p: Partial<ColorSpec>): ColorSpec => ({
  colors: [],
  isArtifact: false,
  isLand: false,
  frameStyle: 'auto',
  customColors: { frame: ['R'], pinline: ['R'], bars: ['R'], textbox: ['R'], pt: ['R'] },
  ...p,
});

describe('canonicalOrder', () => {
  it('2色は正式な並び（友好色・対抗色）になる', () => {
    expect(canonicalOrder(['U', 'W'])).toEqual(['W', 'U']);
    expect(canonicalOrder(['W', 'G'])).toEqual(['G', 'W']);
    expect(canonicalOrder(['W', 'B'])).toEqual(['W', 'B']);
    expect(canonicalOrder(['U', 'G'])).toEqual(['G', 'U']);
    expect(canonicalOrder(['W', 'R'])).toEqual(['R', 'W']);
  });
  it('3色の弧・楔も正式な並び', () => {
    expect(canonicalOrder(['U', 'W', 'G'])).toEqual(['G', 'W', 'U']); // バント
    expect(canonicalOrder(['G', 'B', 'W'])).toEqual(['W', 'B', 'G']); // アブザン
    expect(canonicalOrder(['B', 'W', 'R'])).toEqual(['R', 'W', 'B']); // マルドゥ
  });
  it('重複は除く', () => {
    expect(canonicalOrder(['R', 'R'])).toEqual(['R']);
    expect(canonicalOrder([])).toEqual([]);
  });
});

describe('resolvePartColors', () => {
  it('無色・アーティファクト・土地', () => {
    expect(resolvePartColors(spec({})).frame).toEqual(['colorless']);
    expect(resolvePartColors(spec({ isArtifact: true })).frame).toEqual(['artifact']);
    expect(resolvePartColors(spec({ isLand: true })).frame).toEqual(['land']);
  });
  it('単色はすべてその色', () => {
    const p = resolvePartColors(spec({ colors: ['U'] }));
    expect(p).toEqual({ frame: ['U'], pinline: ['U'], bars: ['U'], textbox: ['U'], pt: ['U'] });
  });
  it('自動の2色はゴールド枠＋2色の縁取り', () => {
    const p = resolvePartColors(spec({ colors: ['W', 'G'] }));
    expect(p.frame).toEqual(['gold']);
    expect(p.pinline).toEqual(['G', 'W']);
  });
  it('3色以上は縁取りもゴールド', () => {
    expect(resolvePartColors(spec({ colors: ['W', 'U', 'B'] })).pinline).toEqual(['gold']);
  });
  it('ハイブリッドは枠そのものが多色', () => {
    const p = resolvePartColors(spec({ colors: ['U', 'W'], frameStyle: 'hybrid' }));
    expect(p.frame).toEqual(['W', 'U']);
    expect(p.pt).toEqual(['U']);
  });
  it('色付きアーティファクトは金属枠＋色付きの縁取り', () => {
    const p = resolvePartColors(spec({ colors: ['R'], isArtifact: true }));
    expect(p.frame).toEqual(['artifact']);
    expect(p.pinline).toEqual(['R']);
  });
  it('カスタムは指定どおり', () => {
    const custom = { frame: ['B' as const], pinline: ['G' as const], bars: ['W' as const], textbox: ['U' as const], pt: ['R' as const] };
    expect(resolvePartColors(spec({ frameStyle: 'custom', customColors: custom }))).toBe(custom);
  });
});

describe('gradientStops', () => {
  it('1色は単色、2色は中央で切り替わる', () => {
    expect(gradientStops(['W'], (p) => p.frame)).toHaveLength(1);
    const s = gradientStops(['W', 'U'], (p) => p.frame);
    expect(s[0][0]).toBe(0);
    expect(s[s.length - 1][0]).toBe(1);
  });
  it('停止位置は昇順', () => {
    const s = gradientStops(['W', 'U', 'B'], (p) => p.frame).map(([o]) => o);
    expect([...s].sort((a, b) => a - b)).toEqual(s);
  });
});
