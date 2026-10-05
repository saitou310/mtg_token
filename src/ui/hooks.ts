import { useEffect, useMemo, useState } from 'react';
import type { TokenData } from '../model/token';
import { ensureFonts, resolveFonts } from '../render/fonts';
import { textsOf } from '../render/prepare';
import type { CardAssets } from '../render/renderCard';
import { useImage } from '../storage/images';

export function useCardAssets(t: TokenData): CardAssets {
  const art = useImage(t.artId);
  const setSymbol = useImage(t.setSymbolId);
  const overlay = useImage(t.overlayId);
  return useMemo(() => ({ art, setSymbol, overlay }), [art, setSymbol, overlay]);
}

/** カードの文字に必要なフォントが読み込まれたら値が変わる（再描画のきっかけ用） */
export function useFontsReady(t: TokenData): number {
  const [tick, setTick] = useState(0);
  const texts = textsOf(t);
  const key = JSON.stringify([t.fonts, texts]);
  useEffect(() => {
    let alive = true;
    ensureFonts(resolveFonts(t.fonts), texts).then(() => alive && setTick((n) => n + 1));
    return () => {
      alive = false;
    };
  }, [key]);
  return tick;
}

export function useElementWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}
