import { CARD_MM } from '../render/units';

export type SheetFormat = 'a4' | 'l' | '2l';

export interface PrintSettings {
  /** カード外周の黒の塗り足し（mm）。0 で無し */
  bleed: number;
  cropMarks: boolean;
  /** 印刷時の倍率ずれを打ち消す補正（1 = 等倍） */
  scale: number;
  /** A4 でのカード同士の間隔（mm） */
  gap: number;
  /** PDF に埋め込むカード画像の解像度 */
  pdfDpi: number;
  /** 写真プリント用 JPEG の解像度 */
  photoDpi: number;
}

export const DEFAULT_PRINT: PrintSettings = {
  bleed: 1.5,
  cropMarks: true,
  scale: 1,
  gap: 0,
  pdfDpi: 450,
  photoDpi: 300,
};

export const SHEETS: Record<SheetFormat, { label: string; wMm: number; hMm: number; perSheet: number }> = {
  a4: { label: 'A4（3×3＝9枚）', wMm: 210, hMm: 297, perSheet: 9 },
  l: { label: 'L判（1枚）', wMm: 89, hMm: 127, perSheet: 1 },
  '2l': { label: '2L判・横（2枚）', wMm: 178, hMm: 127, perSheet: 2 },
};

export interface SlotMm {
  x: number;
  y: number;
}

export interface SheetLayout {
  format: SheetFormat;
  wMm: number;
  hMm: number;
  cardW: number;
  cardH: number;
  slots: SlotMm[];
  /** トンボ（切り取り線の延長）: 線分のリスト [x1, y1, x2, y2] */
  cropMarks: [number, number, number, number][];
  /** 倍率確認用の定規（左端と基線の y）。置く余白が無ければ null */
  ruler: { x: number; y: number; lengthMm: number } | null;
}

/**
 * 用紙上のカード配置（すべて mm、左上原点）
 * @param used 実際にカードを置く枠の数（トンボはその範囲だけに付ける）
 */
export function sheetLayout(format: SheetFormat, s: PrintSettings, used = SHEETS[format].perSheet): SheetLayout {
  const sheet = SHEETS[format];
  const cardW = CARD_MM.w * s.scale;
  const cardH = CARD_MM.h * s.scale;
  const [cols, rows] = format === 'a4' ? [3, 3] : format === '2l' ? [2, 1] : [1, 1];
  const gap = format === '2l' ? Math.max(s.gap, 6) : format === 'a4' ? s.gap : 0;
  const gridW = cols * cardW + (cols - 1) * gap;
  const gridH = rows * cardH + (rows - 1) * gap;
  const x0 = (sheet.wMm - gridW) / 2;
  // A4 は下に定規を置くので少し上寄せ
  const y0 = format === 'a4' ? Math.max(6, (sheet.hMm - gridH) / 2 - 4) : (sheet.hMm - gridH) / 2;

  const slots: SlotMm[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({ x: x0 + c * (cardW + gap), y: y0 + r * (cardH + gap) });
    }
  }

  const cropMarks: SheetLayout['cropMarks'] = [];
  const usedSlots = slots.slice(0, Math.max(1, Math.min(used, slots.length)));
  if (s.cropMarks) {
    const off = s.bleed + 1; // 塗り足しから少し離す
    const len = 4;
    const xs = new Set<number>();
    const ys = new Set<number>();
    for (const sl of usedSlots) {
      xs.add(round(sl.x));
      xs.add(round(sl.x + cardW));
      ys.add(round(sl.y));
      ys.add(round(sl.y + cardH));
    }
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    for (const x of xs) {
      cropMarks.push([x, top - off - len, x, top - off]);
      cropMarks.push([x, bottom + off, x, bottom + off + len]);
    }
    for (const y of ys) {
      cropMarks.push([left - off - len, y, left - off, y]);
      cropMarks.push([right + off, y, right + off + len, y]);
    }
  }

  // 下の余白に十分な空きがあるときだけ定規を置く（トンボと重ならないように）
  const lengthMm = format === 'a4' ? 100 : 50;
  const bottomFree = sheet.hMm - (y0 + gridH);
  const ruler =
    bottomFree >= 14
      ? { x: (sheet.wMm - lengthMm) / 2, y: y0 + gridH + Math.min(bottomFree / 2, 10) + 1, lengthMm }
      : null;

  return { format, wMm: sheet.wMm, hMm: sheet.hMm, cardW, cardH, slots, cropMarks, ruler };
}

function round(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/** 枚数つきの一覧を、用紙ごとのカード列に分ける */
export function paginate<T>(items: { item: T; count: number }[], perSheet: number): T[][] {
  const flat: T[] = [];
  for (const { item, count } of items) for (let i = 0; i < count; i++) flat.push(item);
  const pages: T[][] = [];
  for (let i = 0; i < flat.length; i += perSheet) pages.push(flat.slice(i, i + perSheet));
  return pages;
}
