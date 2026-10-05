import { useEffect, useState } from 'react';
import { newId } from '../model/token';
import { KEYS, load, save } from './db';

/** 取り込む画像の長辺の上限（印刷 600dpi のフルアートでも十分な解像度） */
const MAX_SIDE = 3000;

const bitmaps = new Map<string, Promise<ImageBitmap | null>>();

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, quality),
  );
}

/** 画像ファイルを取り込み（大きすぎれば縮小して）保存し、ID を返す */
export async function importImage(file: Blob): Promise<string> {
  const bmp = await createImageBitmap(file);
  let blob: Blob = file;
  let bitmap = bmp;
  const long = Math.max(bmp.width, bmp.height);
  if (long > MAX_SIDE) {
    const s = MAX_SIDE / long;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * s);
    canvas.height = Math.round(bmp.height * s);
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    // 透過がありうる形式は PNG のまま
    const keepAlpha = /png|webp|gif/.test(file.type);
    blob = await canvasToBlob(canvas, keepAlpha ? 'image/png' : 'image/jpeg', 0.92);
    bmp.close();
    bitmap = await createImageBitmap(canvas);
  }
  const id = newId();
  await save(KEYS.image(id), blob);
  bitmaps.set(id, Promise.resolve(bitmap));
  return id;
}

export function getImageBlob(id: string): Promise<Blob | undefined> {
  return load<Blob>(KEYS.image(id));
}

export async function putImageBlob(id: string, blob: Blob): Promise<void> {
  await save(KEYS.image(id), blob);
  bitmaps.delete(id);
}

export function loadImage(id: string | null): Promise<ImageBitmap | null> {
  if (!id) return Promise.resolve(null);
  let p = bitmaps.get(id);
  if (!p) {
    p = getImageBlob(id).then((b) => (b ? createImageBitmap(b) : null)).catch(() => null);
    bitmaps.set(id, p);
  }
  return p;
}

/** 画像IDから ImageBitmap を得る React フック */
export function useImage(id: string | null): ImageBitmap | null {
  const [state, setState] = useState<{ id: string | null; img: ImageBitmap | null }>({ id: null, img: null });
  useEffect(() => {
    let alive = true;
    loadImage(id).then((img) => alive && setState({ id, img }));
    return () => {
      alive = false;
    };
  }, [id]);
  return state.id === id ? state.img : null;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}
