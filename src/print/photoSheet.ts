import type { TokenData } from '../model/token';
import { fontString } from '../render/fonts';
import { renderCard, type CardAssets } from '../render/renderCard';
import { CARD_H, CARD_W, mmToPx } from '../render/units';
import type { PrintSettings, SheetFormat, SheetLayout } from './layouts';
import { sheetLayout } from './layouts';

type Ctx = CanvasRenderingContext2D;

/**
 * 写真プリント（L判・2L判）用の 1 枚の画像を描く。
 * cards に null を渡した枠はカードの外形線だけ描く（テスト印刷用）。
 */
export function drawPhotoSheet(
  format: SheetFormat,
  cards: (TokenData | null)[],
  assets: Map<string, CardAssets>,
  s: PrintSettings,
): HTMLCanvasElement {
  const layout = sheetLayout(format, s, cards.length);
  const k = mmToPx(1, s.photoDpi); // px / mm
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(layout.wMm * k);
  canvas.height = Math.round(layout.hMm * k);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const slots = layout.slots.slice(0, cards.length);

  // 塗り足し（黒）を先に描き、カードをその上に重ねる
  ctx.fillStyle = '#0d0d0d';
  slots.forEach((sl, i) => {
    if (!cards[i] || s.bleed <= 0) return;
    ctx.fillRect((sl.x - s.bleed) * k, (sl.y - s.bleed) * k, (layout.cardW + s.bleed * 2) * k, (layout.cardH + s.bleed * 2) * k);
  });

  slots.forEach((sl, i) => {
    const t = cards[i];
    if (t) {
      ctx.save();
      ctx.translate(sl.x * k, sl.y * k);
      ctx.scale((layout.cardW * k) / CARD_W, (layout.cardH * k) / CARD_H);
      renderCard(ctx, t, assets.get(t.id) ?? {});
      ctx.restore();
    } else {
      drawCardOutline(ctx, sl.x * k, sl.y * k, layout.cardW * k, layout.cardH * k, k);
    }
  });

  drawCropMarks(ctx, layout, k);
  if (layout.ruler) drawRuler(ctx, layout.ruler, k, s.scale);
  return canvas;
}

function drawCardOutline(ctx: Ctx, x: number, y: number, w: number, h: number, k: number) {
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 0.3 * k;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.font = fontString('"Noto Sans JP", sans-serif', 4 * k, { weight: 700 });
  ctx.fillText(`${(w / k).toFixed(1)} × ${(h / k).toFixed(1)} mm`, x + w / 2, y + h / 2);
  ctx.font = fontString('"Noto Sans JP", sans-serif', 2.6 * k);
  ctx.fillText('この枠を定規で測ってください', x + w / 2, y + h / 2 + 6 * k);
  ctx.restore();
}

function drawCropMarks(ctx: Ctx, layout: SheetLayout, k: number) {
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 0.2 * k;
  ctx.beginPath();
  for (const [x1, y1, x2, y2] of layout.cropMarks) {
    ctx.moveTo(x1 * k, y1 * k);
    ctx.lineTo(x2 * k, y2 * k);
  }
  ctx.stroke();
  ctx.restore();
}

function drawRuler(ctx: Ctx, r: NonNullable<SheetLayout['ruler']>, k: number, scale: number) {
  ctx.save();
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#000';
  ctx.lineWidth = 0.15 * k;
  ctx.beginPath();
  ctx.moveTo(r.x * k, r.y * k);
  ctx.lineTo((r.x + r.lengthMm) * k, r.y * k);
  for (let mm = 0; mm <= r.lengthMm; mm++) {
    const len = mm % 10 === 0 ? 2.6 : mm % 5 === 0 ? 1.8 : 1;
    ctx.moveTo((r.x + mm) * k, r.y * k);
    ctx.lineTo((r.x + mm) * k, (r.y - len) * k);
  }
  ctx.stroke();
  ctx.font = fontString('"Noto Sans JP", sans-serif', 2 * k);
  ctx.textAlign = 'center';
  ctx.fillText(
    `この定規が ${r.lengthMm}mm なら実寸です（倍率補正 ${Math.round(scale * 1000) / 10}%）`,
    (r.x + r.lengthMm / 2) * k,
    (r.y + 3.2) * k,
  );
  ctx.restore();
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('画像の書き出しに失敗しました'))), type, quality),
  );
}
