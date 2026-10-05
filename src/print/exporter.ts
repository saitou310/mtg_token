import JSZip from 'jszip';
import type { TokenData } from '../model/token';
import { prepareToken } from '../render/prepare';
import { renderCardToCanvas, type CardAssets } from '../render/renderCard';
import type { QueueItem } from '../state/store';
import { canShareFiles, downloadFile } from './download';
import { paginate, SHEETS, type PrintSettings } from './layouts';
import { buildA4Pdf, type CardImage } from './pdf';
import { canvasToBlob, drawPhotoSheet } from './photoSheet';

function uniqueTokens(queue: QueueItem[]): TokenData[] {
  const m = new Map<string, TokenData>();
  for (const q of queue) m.set(q.token.id, q.token);
  return [...m.values()];
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

function safeName(s: string): string {
  return (s || 'token').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40);
}

export type Progress = (done: number, total: number) => void;

/** A4 PDF（コンビニの文書プリント向け） */
export async function exportA4Pdf(queue: QueueItem[], s: PrintSettings, onProgress?: Progress): Promise<File> {
  const tokens = uniqueTokens(queue);
  const images = new Map<string, CardImage>();
  for (const [i, t] of tokens.entries()) {
    onProgress?.(i, tokens.length);
    const assets = await prepareToken(t);
    const canvas = document.createElement('canvas');
    renderCardToCanvas(canvas, t, assets, s.pdfDpi);
    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.93);
    images.set(t.id, { bytes: new Uint8Array(await blob.arrayBuffer()), type: 'jpg' });
  }
  onProgress?.(tokens.length, tokens.length);
  const pages = paginate(
    queue.map((q) => ({ item: images.get(q.token.id)!, count: q.count })),
    SHEETS.a4.perSheet,
  );
  const bytes = await buildA4Pdf(pages, s);
  return new File([bytes as BlobPart], `mtg_tokens_A4_${stamp()}.pdf`, { type: 'application/pdf' });
}

/** L判・2L判の JPEG（写真プリント向け） */
export async function exportPhotoSheets(
  format: 'l' | '2l',
  queue: QueueItem[],
  s: PrintSettings,
  onProgress?: Progress,
): Promise<File[]> {
  const assets = new Map<string, CardAssets>();
  for (const t of uniqueTokens(queue)) assets.set(t.id, await prepareToken(t));
  const pages = paginate(
    queue.map((q) => ({ item: q.token, count: q.count })),
    SHEETS[format].perSheet,
  );
  const files: File[] = [];
  const ts = stamp();
  for (const [i, cards] of pages.entries()) {
    onProgress?.(i, pages.length);
    const canvas = drawPhotoSheet(format, cards, assets, s);
    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.95);
    const label = format === 'l' ? 'L' : '2L';
    const name = `${ts}_${label}_${String(i + 1).padStart(2, '0')}_${safeName(cards.map((c) => c.name).join('+'))}.jpg`;
    files.push(new File([blob], name, { type: 'image/jpeg' }));
  }
  onProgress?.(pages.length, pages.length);
  return files;
}

/** カード 1 枚の PNG（SNS・デジタル用） */
export async function exportCardPng(t: TokenData, rounded: boolean, dpi = 450): Promise<File> {
  const assets = await prepareToken(t);
  const canvas = document.createElement('canvas');
  renderCardToCanvas(canvas, t, assets, dpi, { rounded });
  const blob = await canvasToBlob(canvas, 'image/png');
  return new File([blob], `${safeName(t.name)}.png`, { type: 'image/png' });
}

/** 倍率確認用のテストシート */
export async function exportTestSheet(format: 'a4' | 'l' | '2l', s: PrintSettings): Promise<File> {
  if (format === 'a4') {
    const bytes = await buildA4Pdf([[null, null, null, null, null, null, null, null, null]], s);
    return new File([bytes as BlobPart], `test_A4.pdf`, { type: 'application/pdf' });
  }
  const canvas = drawPhotoSheet(format, format === 'l' ? [null] : [null, null], new Map(), s);
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.95);
  return new File([blob], `test_${format === 'l' ? 'L' : '2L'}.jpg`, { type: 'image/jpeg' });
}

/**
 * ファイルを渡す。share なら共有シート、そうでなければダウンロード（複数なら ZIP）。
 */
export async function deliver(files: File[], mode: 'download' | 'share', zipName: string): Promise<void> {
  if (mode === 'share' && canShareFiles(files)) {
    try {
      await navigator.share({ files });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      // 共有できなければダウンロードにフォールバック
    }
  }
  if (files.length === 1) {
    downloadFile(files[0], files[0].name);
    return;
  }
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f);
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadFile(blob, zipName);
}
