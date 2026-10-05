import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import type { TokenData } from '../model/token';
import type { CardLayout } from '../render/cardLayout';
import { renderCard } from '../render/renderCard';
import { CARD_H, CARD_W } from '../render/units';
import { useCardAssets, useFontsReady } from './hooks';

interface Props {
  token: TokenData;
  /** 表示幅（CSS px） */
  width: number;
  placeholder?: boolean;
  onLayout?: (l: CardLayout) => void;
  className?: string;
}

/** トークンを描くキャンバス（端末の画素密度に合わせて描画） */
export const CardCanvas = forwardRef<HTMLCanvasElement | null, Props>(function CardCanvas(
  { token, width, placeholder, onLayout, className },
  outerRef,
) {
  const ref = useRef<HTMLCanvasElement>(null);
  useImperativeHandle(outerRef, () => ref.current!, []);
  const assets = useCardAssets(token);
  const fontsTick = useFontsReady(token);
  const height = (width * CARD_H) / CARD_W;

  useLayoutEffect(() => {
    const c = ref.current;
    if (!c || width <= 0) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    c.width = Math.round(width * dpr);
    c.height = Math.round(height * dpr);
    const ctx = c.getContext('2d')!;
    ctx.setTransform(c.width / CARD_W, 0, 0, c.height / CARD_H, 0, 0);
    const layout = renderCard(ctx, token, assets, { placeholder, rounded: true });
    onLayout?.(layout);
  }, [token, assets, width, height, fontsTick, placeholder, onLayout]);

  return <canvas ref={ref} className={className} style={{ width, height, display: 'block' }} />;
});
