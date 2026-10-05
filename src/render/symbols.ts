import type { SymbolName } from './text/parse';

// mana-font (https://mana.andrewgioia.com) の SVG（viewBox 0 0 32 32）をパスとして使う
const RAW = import.meta.glob<string>(
  '../../node_modules/mana-font/svg/{w,u,b,r,g,c,s,x,y,z,e,p,tap,untap,artist-brush,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20}.svg',
  { query: '?raw', import: 'default', eager: true },
);

function svgPath(file: string): string {
  const key = Object.keys(RAW).find((k) => k.endsWith(`/svg/${file}.svg`));
  if (!key) throw new Error(`mana-font svg not found: ${file}`);
  return [...RAW[key].matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]).join(' ');
}

const FILE_OF: Record<string, string> = { T: 'tap', Q: 'untap' };

const BG: Partial<Record<SymbolName, string>> = {
  W: '#f0f2c0',
  U: '#b5cde3',
  B: '#aca29a',
  R: '#db8664',
  G: '#93b483',
};
const GENERIC_BG = '#bdb7b0';

const pathCache = new Map<string, Path2D>();

function glyph(file: string): Path2D {
  let p = pathCache.get(file);
  if (!p) {
    p = new Path2D(svgPath(file));
    pathCache.set(file, p);
  }
  return p;
}

/**
 * 記号を描く。(cx, cy) は中心、d は直径（カード座標）
 */
export function drawSymbol(ctx: CanvasRenderingContext2D, name: SymbolName, cx: number, cy: number, d: number) {
  const file = FILE_OF[name] ?? name.toLowerCase();
  ctx.save();
  if (name === 'E') {
    // エネルギーは円なしの黒い記号
    drawGlyph(ctx, glyph(file), cx, cy, d * 0.95, '#111');
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.arc(cx, cy, d / 2, 0, Math.PI * 2);
  ctx.fillStyle = BG[name] ?? GENERIC_BG;
  ctx.fill();
  drawGlyph(ctx, glyph(file), cx, cy, d * 0.77, '#111');
  ctx.restore();
}

/** 絵筆アイコン（イラストレーター表記用） */
export function drawArtistBrush(ctx: CanvasRenderingContext2D, x: number, cy: number, size: number, color: string) {
  drawGlyph(ctx, glyph('artist-brush'), x + size / 2, cy, size, color);
}

function drawGlyph(ctx: CanvasRenderingContext2D, path: Path2D, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 32, size / 32);
  ctx.fillStyle = color;
  ctx.fill(path);
  ctx.restore();
}

/** UI 用：記号の SVG パス文字列 */
export function symbolSvgPath(name: SymbolName): string {
  return svgPath(FILE_OF[name] ?? name.toLowerCase());
}

export function symbolBackground(name: SymbolName): string {
  return BG[name] ?? GENERIC_BG;
}
