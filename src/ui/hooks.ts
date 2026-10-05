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

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** 1 カラム表示（スマホ・縦向きタブレット）かどうか。styles.css のブレークポイントと合わせる */
export const COMPACT_QUERY = '(max-width: 960px)';

export function useWindowHeight(): number {
  const [h, setH] = useState(() => window.innerHeight);
  useEffect(() => {
    const onResize = () => setH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return h;
}

/** 下へスクロールしたら true（隠す）、上へ戻ったら false（出す） */
export function useHideOnScroll(): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        // 少しの揺れでは切り替えない
        if (y < 60) setHidden(false);
        else if (y > last + 8) setHidden(true);
        else if (y < last - 8) setHidden(false);
        if (Math.abs(y - last) > 8 || y < 60) last = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return hidden;
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
