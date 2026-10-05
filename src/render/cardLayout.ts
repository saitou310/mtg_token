import type { ArtTransform, TokenData } from '../model/token';
import { parseCardText } from './text/parse';
import { DEFAULT_TEXT_STYLE, fitText, layoutText, type MeasureFn, type TextLayout } from './text/layout';
import { CARD_W, type Rect } from './units';

/** カード各部の配置（単位 0.1mm、カード 630×880） */
export const GEOM = {
  border: 24,
  frame: { x: 24, y: 24, w: 582, h: 812 } as Rect,
  /** イラスト配置の基準（フルアート時に見える範囲） */
  artRef: { x: 36, y: 36, w: 558, h: 788 } as Rect,
  artInset: 22,
  plate: { y: 38, h: 54, minW: 230, maxW: 480, pad: 34, rim: 9 },
  nameSize: 38,
  typeBar: { x: 34, w: 562, h: 50 },
  typeSize: 29,
  textBox: { x: 46, w: 538, bottom: 818, minH: 118, maxH: 330, padX: 22, padTop: 20 },
  /** 能力が無いときのタイプ行の位置 */
  noTextTypeY: 726,
  pt: { x: 486, y: 788, w: 110, h: 50, size: 40 },
  infoBaseline: 864,
} as const;

export interface CardLayout {
  /** イラストが見える範囲（名前タブの切り欠きを除いた外接矩形） */
  artWindow: Rect;
  /** 名前タブ（枠と同じ素材の出っ張り） */
  nameTab: Rect;
  namePlate: Rect;
  /** 名前の横方向の圧縮率（1 = 圧縮なし） */
  nameSquash: number;
  typeBar: Rect;
  textBox: Rect | null;
  text: TextLayout | null;
  /** テキストの描画開始位置（左上） */
  textOrigin: { x: number; y: number } | null;
  ptBox: Rect | null;
}

export interface LayoutMeasure {
  /** 名前（タイトルフォント、太字）の幅 */
  title: (text: string, size: number) => number;
  rules: MeasureFn;
}

export function computeLayout(t: TokenData, m: LayoutMeasure): CardLayout {
  const G = GEOM;
  const { frame, artInset } = G;

  // 名前プレート：名前の長さに合わせて幅を変える
  const nameW = m.title(t.name || ' ', G.nameSize);
  const plateW = Math.min(G.plate.maxW, Math.max(G.plate.minW, nameW + G.plate.pad * 2));
  const namePlate: Rect = { x: (CARD_W - plateW) / 2, y: G.plate.y, w: plateW, h: G.plate.h };
  const available = plateW - G.plate.pad * 1.4;
  const nameSquash = nameW > available ? available / nameW : 1;
  const nameTab: Rect = {
    x: namePlate.x - G.plate.rim,
    y: frame.y,
    w: namePlate.w + G.plate.rim * 2,
    h: namePlate.y + namePlate.h + G.plate.rim - frame.y,
  };

  const paras = parseCardText(t.rules, t.flavor, t.lang === 'en');
  const showPT = t.showPT && (t.power !== '' || t.toughness !== '');
  const ptBox: Rect | null = showPT ? { x: G.pt.x, y: G.pt.y, w: G.pt.w, h: G.pt.h } : null;

  let textBox: Rect | null = null;
  let text: TextLayout | null = null;
  let textOrigin: CardLayout['textOrigin'] = null;
  let typeBarY: number;

  if (paras.length > 0) {
    const tb = G.textBox;
    const innerW = tb.w - tb.padX * 2;
    const padBottom = showPT ? 32 : 20;
    const pads = tb.padTop + padBottom;
    const natural = layoutText(paras, innerW, DEFAULT_TEXT_STYLE, m.rules);
    let h: number;
    if (natural.height + pads <= tb.maxH && !natural.overflowX) {
      text = natural;
      h = Math.max(tb.minH, natural.height + pads);
    } else {
      text = fitText(paras, innerW, tb.maxH - pads, DEFAULT_TEXT_STYLE, m.rules, 14);
      h = tb.maxH;
    }
    textBox = { x: tb.x, y: tb.bottom - h, w: tb.w, h };
    // 枠の中央に置く。ただし P/T 欄に重ならない範囲で
    const centered = textBox.y + (h - text.height) / 2;
    const y = Math.max(textBox.y + tb.padTop, Math.min(centered, tb.bottom - padBottom - text.height));
    textOrigin = { x: tb.x + tb.padX, y };
    typeBarY = textBox.y - G.typeBar.h + 6;
  } else {
    typeBarY = G.noTextTypeY;
  }

  const typeBar: Rect = { x: G.typeBar.x, y: typeBarY, w: G.typeBar.w, h: G.typeBar.h };

  const artWindow: Rect = t.fullArt
    ? { ...G.artRef }
    : {
        x: frame.x + artInset,
        y: frame.y + artInset,
        w: frame.w - artInset * 2,
        h: typeBar.y + typeBar.h / 2 - (frame.y + artInset),
      };

  return { artWindow, nameTab, namePlate, nameSquash, typeBar, textBox, text, textOrigin, ptBox };
}

export interface Size {
  w: number;
  h: number;
}

/**
 * 画像を artWindow に「埋める(cover)」または「全体表示(contain)」する配置を求める。
 * ArtTransform は artRef を cover した状態を基準(scale=1, 中心一致)とする。
 */
export function fitArt(mode: 'cover' | 'contain', img: Size, win: Rect): ArtTransform {
  const ref = GEOM.artRef;
  const base = Math.max(ref.w / img.w, ref.h / img.h);
  const target = mode === 'cover' ? Math.max(win.w / img.w, win.h / img.h) : Math.min(win.w / img.w, win.h / img.h);
  return {
    scale: target / base,
    x: win.x + win.w / 2 - (ref.x + ref.w / 2),
    y: win.y + win.h / 2 - (ref.y + ref.h / 2),
  };
}

/** ArtTransform から画像の描画矩形を求める */
export function artDrawRect(img: Size, tr: ArtTransform): Rect {
  const ref = GEOM.artRef;
  const s = Math.max(ref.w / img.w, ref.h / img.h) * tr.scale;
  const w = img.w * s;
  const h = img.h * s;
  return { x: ref.x + ref.w / 2 + tr.x - w / 2, y: ref.y + ref.h / 2 + tr.y - h / 2, w, h };
}
