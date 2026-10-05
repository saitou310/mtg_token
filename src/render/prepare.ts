import type { TokenData } from '../model/token';
import { loadImage } from '../storage/images';
import { ensureFonts, resolveFonts } from './fonts';
import type { CardAssets } from './renderCard';

export function textsOf(t: TokenData) {
  return {
    title: `${t.name}${t.typeLine}${t.power}/${t.toughness}${t.artist}${t.footer}0123456789`,
    rules: t.rules + t.flavor,
  };
}

/** 描画前に必要なフォントと画像をそろえる */
export async function prepareToken(t: TokenData): Promise<CardAssets> {
  const [art, setSymbol, overlay] = await Promise.all([
    loadImage(t.artId),
    loadImage(t.setSymbolId),
    loadImage(t.overlayId),
    ensureFonts(resolveFonts(t.fonts), textsOf(t)),
  ]);
  return { art, setSymbol, overlay };
}
