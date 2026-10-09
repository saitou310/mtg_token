import { track } from '../../analytics';
import { fitArt } from '../../render/cardLayout';
import { layoutFor } from '../../render/renderCard';
import type { Rect } from '../../render/units';
import { useStore } from '../../state/store';
import { importImage, loadImage } from '../../storage/images';
import type { TokenData } from '../../model/token';

let scratch: CanvasRenderingContext2D | null = null;

/** 現在の設定でのイラスト窓 */
export function artWindowFor(t: TokenData): Rect {
  scratch ??= document.createElement('canvas').getContext('2d')!;
  return layoutFor(scratch, t).artWindow;
}

export function isImageFile(f: File | Blob): boolean {
  return f.type.startsWith('image/');
}

/** 画像ファイルをイラストとして設定し、イラスト窓を埋めるように配置する */
export async function setArtFromFile(file: Blob): Promise<void> {
  const st = useStore.getState();
  if (!isImageFile(file)) {
    st.showToast('画像ファイルを選んでください');
    return;
  }
  try {
    const id = await importImage(file);
    const img = await loadImage(id);
    const t = useStore.getState().token;
    const artTransform = img ? fitArt('cover', { w: img.width, h: img.height }, artWindowFor(t)) : t.artTransform;
    useStore.getState().update({ artId: id, artTransform });
    track('set_art');
  } catch (e) {
    console.error(e);
    st.showToast('画像を読み込めませんでした（対応していない形式かもしれません）');
  }
}

export async function fitCurrentArt(mode: 'cover' | 'contain'): Promise<void> {
  const t = useStore.getState().token;
  const img = await loadImage(t.artId);
  if (!img) return;
  useStore.getState().update({ artTransform: fitArt(mode, { w: img.width, h: img.height }, artWindowFor(t)) });
}

/** 別用途の画像（セット記号・枠オーバーレイ）を取り込む */
export async function importAuxImage(file: Blob, key: 'setSymbolId' | 'overlayId'): Promise<void> {
  const st = useStore.getState();
  if (!isImageFile(file)) {
    st.showToast('画像ファイルを選んでください');
    return;
  }
  const id = await importImage(file);
  useStore.getState().update({ [key]: id });
}
