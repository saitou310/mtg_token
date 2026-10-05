/** カード座標の単位は 0.1mm。カードは 63×88mm = 630×880 単位 */
export const CARD_W = 630;
export const CARD_H = 880;
export const CARD_MM = { w: 63, h: 88 } as const;

export const MM_PER_INCH = 25.4;

/** 指定DPIでの 1 単位あたりのピクセル数 */
export function pxPerUnit(dpi: number): number {
  return dpi / (MM_PER_INCH * 10);
}

export function mmToPx(mm: number, dpi: number): number {
  return (mm / MM_PER_INCH) * dpi;
}

/** PDF の 1pt = 1/72 inch */
export function mmToPt(mm: number): number {
  return (mm / MM_PER_INCH) * 72;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
