import { normalizeToken, type TokenData } from '../model/token';
import { blobToDataUrl, dataUrlToBlob, getImageBlob, putImageBlob } from './images';

interface BackupFile {
  app: 'mtg-token-maker';
  version: 1;
  tokens: TokenData[];
  /** 画像ID → data URL */
  images: Record<string, string>;
}

function imageIds(t: TokenData): string[] {
  return [t.artId, t.setSymbolId, t.overlayId].filter((x): x is string => !!x);
}

/** トークン（画像込み）を 1 つの JSON にまとめる */
export async function exportBackup(tokens: TokenData[]): Promise<Blob> {
  const images: Record<string, string> = {};
  for (const id of new Set(tokens.flatMap(imageIds))) {
    const blob = await getImageBlob(id);
    if (blob) images[id] = await blobToDataUrl(blob);
  }
  const data: BackupFile = { app: 'mtg-token-maker', version: 1, tokens, images };
  return new Blob([JSON.stringify(data)], { type: 'application/json' });
}

export async function importBackup(file: Blob): Promise<TokenData[]> {
  const data = JSON.parse(await file.text()) as Partial<BackupFile>;
  if (data.app !== 'mtg-token-maker' || !Array.isArray(data.tokens)) {
    throw new Error('このファイルは MTG トークンメーカーのデータではありません');
  }
  for (const [id, url] of Object.entries(data.images ?? {})) {
    await putImageBlob(id, await dataUrlToBlob(url));
  }
  return data.tokens.map(normalizeToken);
}
