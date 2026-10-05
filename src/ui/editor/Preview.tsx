import { useEffect, useRef } from 'react';
import type { ArtTransform } from '../../model/token';
import { GEOM } from '../../render/cardLayout';
import { CARD_W } from '../../render/units';
import { useStore } from '../../state/store';
import { useImage } from '../../storage/images';
import { CardCanvas } from '../CardCanvas';
import { useElementWidth } from '../hooks';
import { setArtFromFile } from './art';

type Pt = { x: number; y: number };

const REF_CENTER: Pt = { x: GEOM.artRef.x + GEOM.artRef.w / 2, y: GEOM.artRef.y + GEOM.artRef.h / 2 };

/**
 * 画像の拡大縮小。点 p0（カード座標）にあった部分が p1 に来るように、倍率を f 倍にする
 */
function zoomAround(t: ArtTransform, f: number, p0: Pt, p1: Pt): ArtTransform {
  const scale = Math.max(0.05, Math.min(10, t.scale * f));
  const k = scale / t.scale;
  const cx = REF_CENTER.x + t.x;
  const cy = REF_CENTER.y + t.y;
  return { scale, x: p1.x + (cx - p0.x) * k - REF_CENTER.x, y: p1.y + (cy - p0.y) * k - REF_CENTER.y };
}

export function Preview() {
  const token = useStore((s) => s.token);
  const wrapRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const width = Math.floor(Math.min(460, useElementWidth(wrapRef)));
  const art = useImage(token.artId);
  const fileRef = useRef<HTMLInputElement>(null);

  const pointers = useRef(new Map<number, Pt>());
  const gesture = useRef<{ t: ArtTransform; pts: Map<number, Pt> } | null>(null);

  const toCard = (clientX: number, clientY: number): Pt => {
    const r = boxRef.current!.getBoundingClientRect();
    const k = CARD_W / r.width;
    return { x: (clientX - r.left) * k, y: (clientY - r.top) * k };
  };

  const rebase = () => {
    gesture.current = pointers.current.size
      ? { t: useStore.getState().token.artTransform, pts: new Map(pointers.current) }
      : null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!art) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, toCard(e.clientX, e.clientY));
    rebase();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, toCard(e.clientX, e.clientY));
    const ids = [...g.pts.keys()].filter((id) => pointers.current.has(id));
    let next: ArtTransform;
    if (ids.length >= 2) {
      const [a0, b0] = [g.pts.get(ids[0])!, g.pts.get(ids[1])!];
      const [a1, b1] = [pointers.current.get(ids[0])!, pointers.current.get(ids[1])!];
      const d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y) || 1;
      const d1 = Math.hypot(a1.x - b1.x, a1.y - b1.y);
      const m0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
      const m1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 };
      next = zoomAround(g.t, d1 / d0, m0, m1);
    } else if (ids.length === 1) {
      const p0 = g.pts.get(ids[0])!;
      const p1 = pointers.current.get(ids[0])!;
      next = { ...g.t, x: g.t.x + p1.x - p0.x, y: g.t.y + p1.y - p0.y };
    } else return;
    useStore.getState().update({ artTransform: next });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    rebase();
  };

  // ホイールで拡大縮小（ページのスクロールを止めるため passive: false で登録）
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!useStore.getState().token.artId) return;
      e.preventDefault();
      const p = toCard(e.clientX, e.clientY);
      const t = useStore.getState().token.artTransform;
      useStore.getState().update({ artTransform: zoomAround(t, Math.exp(-e.deltaY * 0.0015), p, p) });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div ref={wrapRef} className="preview-wrap">
      <div
        ref={boxRef}
        className={`preview-box ${art ? 'has-art' : 'no-art'}`}
        style={{ width }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => !art && fileRef.current?.click()}
        title={art ? 'ドラッグで移動・ホイール/ピンチで拡大縮小' : 'クリックで画像を選択'}
      >
        {width > 0 && <CardCanvas token={token} width={width} placeholder />}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setArtFromFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
