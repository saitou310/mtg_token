import { decodePDFRawStream, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PRINT } from './layouts';
import { buildA4Pdf, type CardImage } from './pdf';

// 1×1 の PNG
const PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  (c) => c.charCodeAt(0),
);
const card: CardImage = { bytes: PNG, type: 'png' };
const ptToMm = (pt: number) => (pt / 72) * 25.4;

async function contentOf(bytes: Uint8Array, page = 0): Promise<{ doc: PDFDocument; text: string }> {
  const doc = await PDFDocument.load(bytes);
  const p = doc.getPages()[page];
  const c = p.node.Contents()!;
  const streams = 'asArray' in c ? (c as unknown as { asArray(): unknown[] }).asArray().map((r) => doc.context.lookup(r as never)) : [c];
  const text = streams.map((s) => new TextDecoder().decode(decodePDFRawStream(s as PDFRawStream).decode())).join('\n');
  return { doc, text };
}

describe('buildA4Pdf', () => {
  it('A4 サイズで、カード画像は 63×88mm で配置される', async () => {
    const bytes = await buildA4Pdf([[card, card, card, card, card, card, card, card, card], [card]], DEFAULT_PRINT);
    const { doc, text } = await contentOf(bytes);
    expect(doc.getPageCount()).toBe(2);
    const { width, height } = doc.getPages()[0].getSize();
    expect(ptToMm(width)).toBeCloseTo(210, 1);
    expect(ptToMm(height)).toBeCloseTo(297, 1);

    const sizes = [...text.matchAll(/([\d.]+) 0 0 ([\d.]+) 0 0 cm\s+1 0 0 1 0 0 cm\s+\/\S+ Do/g)].map((m) => [
      ptToMm(Number(m[1])),
      ptToMm(Number(m[2])),
    ]);
    expect(sizes).toHaveLength(9);
    for (const [w, h] of sizes) {
      expect(w).toBeCloseTo(63, 2);
      expect(h).toBeCloseTo(88, 2);
    }
  });

  it('同じ画像は 1 回だけ埋め込む', async () => {
    const other: CardImage = { bytes: PNG.slice(), type: 'png' };
    const bytes = await buildA4Pdf([[card, card, other, card]], DEFAULT_PRINT);
    const doc = await PDFDocument.load(bytes);
    const images = doc.context
      .enumerateIndirectObjects()
      .filter(([, obj]) => obj instanceof PDFRawStream && String(obj.dict.get(PDFName.of('Subtype'))) === '/Image')
      // 透過PNGに付く SMask（グレースケールのマスク画像）は数えない
      .filter(([, obj]) => String((obj as PDFRawStream).dict.get(PDFName.of('ColorSpace'))) === '/DeviceRGB');
    expect(images).toHaveLength(2);
  });

  it('テストシート（画像なし）は外形線と寸法の文字だけ', async () => {
    const bytes = await buildA4Pdf([[null, null]], { ...DEFAULT_PRINT, scale: 1.02 });
    const { text } = await contentOf(bytes);
    expect(text).not.toMatch(/ Do/);
    expect(text).toMatch(/Tj/);
  });
});
