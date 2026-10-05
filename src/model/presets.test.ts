import { describe, expect, it } from 'vitest';
import { appendKeyword, applyPreset, KEYWORDS, PRESETS } from './presets';

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
