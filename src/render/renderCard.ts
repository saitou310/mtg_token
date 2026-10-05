import { PALETTES, gradientStops, resolvePartColors, type Palette, type PaletteKey } from '../model/colors';
import type { TokenData } from '../model/token';
import { GEOM, artDrawRect, computeLayout, type CardLayout, type LayoutMeasure } from './cardLayout';
import { shade } from './color';
import { fontString, resolveFonts, type ResolvedFonts } from './fonts';
import { drawArtistBrush, drawSymbol } from './symbols';
import { getTexture } from './texture';
import { CARD_H, CARD_W, pxPerUnit, type Rect } from './units';

export type ImageLike = ImageBitmap | HTMLImageElement | HTMLCanvasElement;

export function imageSize(img: ImageLike): { w: number; h: number } {
  if (img instanceof HTMLImageElement) return { w: img.naturalWidth, h: img.naturalHeight };
  return { w: img.width, h: img.height };
}

export interface CardAssets {
  art?: ImageLike | null;
  setSymbol?: ImageLike | null;
  overlay?: ImageLike | null;
}

export interface RenderOptions {
  /** 画像が無いとき「ここにドロップ」の案内を描く（プレビュー用） */
  placeholder?: boolean;
  /** 角を丸く切り抜く（PNG単体出力用） */
  rounded?: boolean;
}

type Ctx = CanvasRenderingContext2D;
type Pick = (p: Palette) => string;

/** 部位の色（1色なら単色、複数なら x0→x1 の横グラデーション） */
function paint(ctx: Ctx, keys: PaletteKey[], pick: Pick, x0: number, x1: number): string | CanvasGradient {
  const stops = gradientStops(keys, pick);
  if (stops.length === 1) return stops[0][1];
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function rr(r: Rect, radius: number, grow = 0): Path2D {
  const p = new Path2D();
  p.roundRect(r.x - grow, r.y - grow, r.w + grow * 2, r.h + grow * 2, Math.max(0, radius + grow));
  return p;
}

function texturePattern(ctx: Ctx, kind: 'frame' | 'paper', scale: number): CanvasPattern | null {
  const pat = ctx.createPattern(getTexture(kind), 'repeat');
  pat?.setTransform(new DOMMatrix().scale(scale));
  return pat;
}

/** 質感を乗せる（clip 済みの領域に対して） */
function applyTexture(ctx: Ctx, path: Path2D, kind: 'frame' | 'paper', op: GlobalCompositeOperation, alpha: number) {
  const pat = texturePattern(ctx, kind, kind === 'frame' ? 1.1 : 0.6);
  if (!pat) return;
  ctx.save();
  ctx.clip(path);
  ctx.globalCompositeOperation = op;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pat;
  ctx.fill(path);
  ctx.restore();
}

/** 上を明るく下を暗くする陰影 */
function applyShading(ctx: Ctx, path: Path2D, r: Rect, top: number, bottom: number) {
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, `rgba(255,255,255,${top})`);
  g.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.addColorStop(0.55, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${bottom})`);
  ctx.fillStyle = g;
  ctx.fill(path);
}

/** イラスト窓（上部に名前タブの切り欠きあり） */
function artPath(win: Rect, tab: Rect): Path2D {
  const p = new Path2D();
  const f = 12;
  const r = 22;
  const x0 = tab.x;
  const x1 = tab.x + tab.w;
  const yb = tab.y + tab.h;
  p.moveTo(win.x, win.y);
  p.lineTo(x0 - f, win.y);
  p.quadraticCurveTo(x0, win.y, x0, win.y + f);
  p.lineTo(x0, yb - r);
  p.quadraticCurveTo(x0, yb, x0 + r, yb);
  p.lineTo(x1 - r, yb);
  p.quadraticCurveTo(x1, yb, x1, yb - r);
  p.lineTo(x1, win.y + f);
  p.quadraticCurveTo(x1, win.y, x1 + f, win.y);
  p.lineTo(win.x + win.w, win.y);
  p.lineTo(win.x + win.w, win.y + win.h);
  p.lineTo(win.x, win.y + win.h);
  p.closePath();
  return p;
}

function makeMeasure(ctx: Ctx, fonts: ResolvedFonts): LayoutMeasure {
  const cache = new Map<string, number>();
  const measure = (font: string, text: string) => {
    const key = font + '\u0000' + text;
    let w = cache.get(key);
    if (w === undefined) {
      ctx.font = font;
      w = ctx.measureText(text).width;
      cache.set(key, w);
    }
    return w;
  };
  return {
    title: (text, size) => measure(fontString(fonts.title, size, { weight: fonts.titleWeight }), text),
    rules: (text, italic, size) => measure(fontString(fonts.rules, size, { italic }), text),
  };
}

export function layoutFor(ctx: Ctx, t: TokenData): CardLayout {
  return computeLayout(t, makeMeasure(ctx, resolveFonts(t.fonts)));
}

/**
 * カードを描く。ctx は「1 = 0.1mm」のカード座標に変換済みであること。
 */
export function renderCard(ctx: Ctx, t: TokenData, assets: CardAssets = {}, opts: RenderOptions = {}): CardLayout {
  const fonts = resolveFonts(t.fonts);
  const measure = makeMeasure(ctx, fonts);
  const L = computeLayout(t, measure);
  const parts = resolvePartColors(t);
  const frame = GEOM.frame;
  const drawFrame = !(assets.overlay && t.overlayReplacesFrame);

  ctx.save();
  if (opts.rounded) {
    ctx.beginPath();
    ctx.roundRect(0, 0, CARD_W, CARD_H, 30);
    ctx.clip();
  }

  // 黒枠
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const framePath = rr(frame, 9);
  const art = artPath(L.artWindow, L.nameTab);

  // 色付き枠
  if (drawFrame) {
    ctx.fillStyle = paint(ctx, parts.frame, (p) => p.frame, frame.x, frame.x + frame.w);
    ctx.fill(framePath);
    applyTexture(ctx, framePath, 'frame', 'soft-light', 0.85);
    applyShading(ctx, framePath, frame, 0.12, 0.18);
    // 外周の縁取り線
    ctx.lineWidth = 3;
    ctx.strokeStyle = paint(ctx, parts.pinline, (p) => p.pinline, frame.x, frame.x + frame.w);
    ctx.stroke(rr(frame, 7, -4));
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.stroke(rr(frame, 7, -6));
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke(rr(frame, 8, -1.5));
  }

  // イラスト
  drawArt(ctx, t, assets, art, L, parts, opts);

  if (drawFrame) {
    // イラスト窓の縁
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = paint(ctx, parts.pinline, (p) => p.pinline, frame.x, frame.x + frame.w);
    ctx.stroke(art);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.stroke(art);
    ctx.save();
    ctx.clip(art);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.stroke(art);
    ctx.restore();
  }

  // ユーザーの枠オーバーレイ
  if (assets.overlay) {
    ctx.drawImage(assets.overlay, 0, 0, CARD_W, CARD_H);
  }

  if (L.textBox && drawFrame) drawTextBox(ctx, L.textBox, parts, t.fullArt);
  if (drawFrame) {
    drawPlate(ctx, L.typeBar, 9, parts.bars, parts.pinline, t.fullArt ? 0.92 : 1);
    drawPlate(ctx, L.namePlate, 20, parts.bars, parts.pinline, 1);
    if (L.ptBox) drawPlate(ctx, L.ptBox, 12, parts.pt, parts.pinline, 1);
  }

  drawName(ctx, t, L, fonts);
  drawTypeLine(ctx, t, L, fonts, assets.setSymbol ?? null);
  drawRules(ctx, L, fonts);
  if (L.ptBox) drawPT(ctx, t, L.ptBox, fonts);
  drawInfo(ctx, t, fonts);

  ctx.restore();
  return L;
}

function drawArt(ctx: Ctx, t: TokenData, assets: CardAssets, art: Path2D, L: CardLayout, parts: ReturnType<typeof resolvePartColors>, opts: RenderOptions) {
  ctx.save();
  ctx.clip(art);
  const win = L.artWindow;
  if (assets.art) {
    ctx.fillStyle = '#000';
    ctx.fill(art);
    const r = artDrawRect(imageSize(assets.art), t.artTransform);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(assets.art, r.x, r.y, r.w, r.h);
  } else {
    const g = ctx.createLinearGradient(win.x, win.y, win.x + win.w, win.y + win.h);
    const keys = parts.frame;
    const first = PALETTES[keys[0]].frame;
    const last = PALETTES[keys[keys.length - 1]].frame;
    g.addColorStop(0, shade(first, 0.55));
    g.addColorStop(1, shade(last, 0.25));
    ctx.fillStyle = g;
    ctx.fill(art);
    if (opts.placeholder) {
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = fontString('"Noto Sans JP", sans-serif', 26, { weight: 700 });
      const cy = Math.max(win.y + 120, win.y + win.h / 2);
      ctx.fillText('ここに画像をドラッグ＆ドロップ', CARD_W / 2, cy - 18);
      ctx.font = fontString('"Noto Sans JP", sans-serif', 20);
      ctx.fillText('（クリックでファイル選択 / Ctrl+V で貼り付け）', CARD_W / 2, cy + 20);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }
  }
  ctx.restore();
}

/** 名前・タイプ・P/T の帯（縁取り＋陰影＋紙質感） */
function drawPlate(ctx: Ctx, r: Rect, radius: number, fill: PaletteKey[], rim: PaletteKey[], alpha: number) {
  const outer = rr(r, radius, 5);
  const rimPath = rr(r, radius, 3);
  const inner = rr(r, radius);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fill(outer);
  ctx.fillStyle = paint(ctx, rim, (p) => shade(p.pinline, 0.08), r.x, r.x + r.w);
  ctx.fill(rimPath);
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.stroke(rr(r, radius, 2.4));

  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fill(rr(r, radius, 0.9));
  ctx.fillStyle = paint(ctx, fill, (p) => p.bar, r.x, r.x + r.w);
  ctx.fill(inner);
  ctx.globalAlpha = 1;
  applyTexture(ctx, inner, 'paper', 'multiply', 0.16);
  applyShading(ctx, inner, r, 0.5, 0.16);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.stroke(rr(r, radius, -1.6));
  ctx.restore();
}

function drawTextBox(ctx: Ctx, r: Rect, parts: ReturnType<typeof resolvePartColors>, translucent: boolean) {
  const inner = rr(r, 3);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fill(rr(r, 3, 6));
  ctx.fillStyle = paint(ctx, parts.pinline, (p) => p.pinline, r.x, r.x + r.w);
  ctx.fill(rr(r, 3, 4.5));
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fill(rr(r, 3, 1));
  ctx.globalAlpha = translucent ? 0.86 : 1;
  ctx.fillStyle = paint(ctx, parts.textbox, (p) => p.textbox, r.x, r.x + r.w);
  ctx.fill(inner);
  ctx.globalAlpha = 1;
  applyTexture(ctx, inner, 'paper', 'multiply', 0.12);
  // 内側の影
  ctx.clip(inner);
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.stroke(inner);
  ctx.restore();
}

function fillTextSquashed(ctx: Ctx, text: string, x: number, y: number, squash: number) {
  if (squash >= 0.999) {
    ctx.fillText(text, x, y);
    return;
  }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(squash, 1);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawName(ctx: Ctx, t: TokenData, L: CardLayout, fonts: ResolvedFonts) {
  const p = L.namePlate;
  ctx.save();
  ctx.fillStyle = '#111';
  ctx.font = fontString(fonts.title, GEOM.nameSize, { weight: fonts.titleWeight });
  ctx.textAlign = 'center';
  fillTextSquashed(ctx, t.name, p.x + p.w / 2, p.y + p.h / 2 + GEOM.nameSize * 0.36, L.nameSquash);
  ctx.restore();
}

function drawTypeLine(ctx: Ctx, t: TokenData, L: CardLayout, fonts: ResolvedFonts, setSymbol: ImageLike | null) {
  const b = L.typeBar;
  const padL = 18;
  let right = b.x + b.w - 16;
  if (setSymbol) {
    const s = imageSize(setSymbol);
    const h = 34;
    const w = Math.min(60, (s.w / s.h) * h);
    ctx.drawImage(setSymbol, right - w, b.y + (b.h - h) / 2, w, h);
    right -= w + 10;
  }
  ctx.save();
  ctx.fillStyle = '#111';
  ctx.font = fontString(fonts.title, GEOM.typeSize, { weight: fonts.titleWeight });
  const avail = right - (b.x + padL);
  const w = ctx.measureText(t.typeLine).width;
  fillTextSquashed(ctx, t.typeLine, b.x + padL, b.y + b.h / 2 + GEOM.typeSize * 0.36, w > avail ? avail / w : 1);
  ctx.restore();
}

function drawRules(ctx: Ctx, L: CardLayout, fonts: ResolvedFonts) {
  if (!L.text || !L.textOrigin || !L.textBox) return;
  const { lines, fontSize, dividerY } = L.text;
  const o = L.textOrigin;
  ctx.save();
  ctx.fillStyle = '#111';
  for (const line of lines) {
    for (const item of line.items) {
      if (item.kind === 'symbol') {
        const d = item.w;
        drawSymbol(ctx, item.name, o.x + item.x + d / 2, o.y + line.baseline - fontSize * 0.3, d);
      } else {
        ctx.font = fontString(fonts.rules, fontSize, { italic: item.italic });
        ctx.fillText(item.text, o.x + item.x, o.y + line.baseline);
      }
    }
  }
  if (dividerY !== null) {
    const tb = L.textBox;
    const y = o.y + dividerY;
    const g = ctx.createLinearGradient(tb.x + 30, 0, tb.x + tb.w - 30, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.15, 'rgba(0,0,0,0.55)');
    g.addColorStop(0.85, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(tb.x + 30, y - 0.8, tb.w - 60, 1.6);
  }
  ctx.restore();
}

function drawPT(ctx: Ctx, t: TokenData, r: Rect, fonts: ResolvedFonts) {
  const text = `${t.power}/${t.toughness}`;
  ctx.save();
  ctx.fillStyle = '#111';
  ctx.font = fontString(fonts.title, GEOM.pt.size, { weight: fonts.titleWeight });
  ctx.textAlign = 'center';
  const w = ctx.measureText(text).width;
  const avail = r.w - 16;
  fillTextSquashed(ctx, text, r.x + r.w / 2, r.y + r.h / 2 + GEOM.pt.size * 0.36, w > avail ? avail / w : 1);
  ctx.restore();
}

function drawInfo(ctx: Ctx, t: TokenData, fonts: ResolvedFonts) {
  const y = GEOM.infoBaseline;
  ctx.save();
  ctx.fillStyle = '#f2f2f2';
  if (t.artist.trim()) {
    const size = 17;
    drawArtistBrush(ctx, 36, y - size * 0.34, 22, '#f2f2f2');
    ctx.font = fontString(fonts.title, size, { weight: fonts.titleWeight });
    ctx.fillText(t.artist.trim(), 62, y);
  }
  if (t.footer.trim()) {
    ctx.font = fontString(fonts.title, 14);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(242,242,242,0.85)';
    ctx.fillText(t.footer.trim(), CARD_W - 36, y);
  }
  ctx.restore();
}

/** 指定DPIのキャンバスにカードを描く */
export function renderCardToCanvas(
  canvas: HTMLCanvasElement,
  t: TokenData,
  assets: CardAssets,
  dpi: number,
  opts: RenderOptions = {},
): CardLayout {
  const s = pxPerUnit(dpi);
  canvas.width = Math.round(CARD_W * s);
  canvas.height = Math.round(CARD_H * s);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(canvas.width / CARD_W, 0, 0, canvas.height / CARD_H, 0, 0);
  return renderCard(ctx, t, assets, opts);
}
