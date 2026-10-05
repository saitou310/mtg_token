import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFPage } from 'pdf-lib';
import { mmToPt } from '../render/units';
import { sheetLayout, type PrintSettings, type SheetLayout } from './layouts';

export interface CardImage {
  bytes: Uint8Array;
  type: 'jpg' | 'png';
}

/**
 * A4 の PDF を組み立てる。pages の各要素は 1 ページに載せるカード画像（最大 9 枚）。
 * null の枠は外形線だけ描く（テスト印刷用）。
 */
export async function buildA4Pdf(pages: (CardImage | null)[][], s: PrintSettings): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle('MTG Tokens');
  doc.setCreator('MTG Token Maker');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const embedded = new Map<Uint8Array, PDFImage>();

  for (const cards of pages) {
    const layout = sheetLayout('a4', s, cards.length);
    const page = doc.addPage([mmToPt(layout.wMm), mmToPt(layout.hMm)]);
    const H = page.getHeight();
    const rect = (x: number, y: number, w: number, h: number) => ({
      x: mmToPt(x),
      y: H - mmToPt(y + h),
      width: mmToPt(w),
      height: mmToPt(h),
    });

    const slots = layout.slots.slice(0, cards.length);
    if (s.bleed > 0) {
      slots.forEach((sl, i) => {
        if (!cards[i]) return;
        page.drawRectangle({
          ...rect(sl.x - s.bleed, sl.y - s.bleed, layout.cardW + s.bleed * 2, layout.cardH + s.bleed * 2),
          color: rgb(0.05, 0.05, 0.05),
        });
      });
    }
    for (const [i, sl] of slots.entries()) {
      const card = cards[i];
      if (card) {
        let img = embedded.get(card.bytes);
        if (!img) {
          img = card.type === 'jpg' ? await doc.embedJpg(card.bytes) : await doc.embedPng(card.bytes);
          embedded.set(card.bytes, img);
        }
        page.drawImage(img, rect(sl.x, sl.y, layout.cardW, layout.cardH));
      } else {
        page.drawRectangle({
          ...rect(sl.x, sl.y, layout.cardW, layout.cardH),
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.6,
        });
        const label = `${layout.cardW.toFixed(1)} x ${layout.cardH.toFixed(1)} mm`;
        const r = rect(sl.x, sl.y, layout.cardW, layout.cardH);
        page.drawText(label, {
          x: r.x + r.width / 2 - font.widthOfTextAtSize(label, 10) / 2,
          y: r.y + r.height / 2,
          size: 10,
          font,
        });
      }
    }
    drawCropMarks(page, layout, H);
    if (layout.ruler) drawRuler(page, layout.ruler, H, font, s.scale);
  }
  return doc.save();
}

function drawCropMarks(page: PDFPage, layout: SheetLayout, H: number) {
  for (const [x1, y1, x2, y2] of layout.cropMarks) {
    page.drawLine({
      start: { x: mmToPt(x1), y: H - mmToPt(y1) },
      end: { x: mmToPt(x2), y: H - mmToPt(y2) },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
  }
}

function drawRuler(
  page: PDFPage,
  r: NonNullable<SheetLayout['ruler']>,
  H: number,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  scale: number,
) {
  const y = H - mmToPt(r.y);
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.4, color: rgb(0, 0, 0) });
  line(mmToPt(r.x), y, mmToPt(r.x + r.lengthMm), y);
  for (let mm = 0; mm <= r.lengthMm; mm++) {
    const len = mm % 10 === 0 ? 2.6 : mm % 5 === 0 ? 1.8 : 1;
    const x = mmToPt(r.x + mm);
    line(x, y, x, y + mmToPt(len));
  }
  const caption = `Actual size if this ruler is ${r.lengthMm} mm  (scale correction ${Math.round(scale * 1000) / 10}%)`;
  page.drawText(caption, {
    x: mmToPt(r.x + r.lengthMm / 2) - font.widthOfTextAtSize(caption, 7) / 2,
    y: y - mmToPt(3.5),
    size: 7,
    font,
  });
}
