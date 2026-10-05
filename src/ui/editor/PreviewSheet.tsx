import { useEffect, useRef, useState } from 'react';
import { CARD_H, CARD_W } from '../../render/units';
import { useStore } from '../../state/store';
import { CardCanvas } from '../CardCanvas';
import { useWindowHeight } from '../hooks';
import { Preview } from './Preview';
import { PreviewActions } from './PreviewActions';

/** 画面下のバーの高さ（styles.css の --bar-h と合わせる） */
const BAR_H = 76;
/** 開いたシートの上に残す隙間 */
const TOP_GAP = 12;
/** シート内でプレビュー以外が使う高さ（見出し・操作ボタン・余白） */
const SHEET_CHROME = 48 + 112 + 48;

type SheetState =
  | { kind: 'closed' }
  /** 指で動かしている最中。offset は開いた位置からの下方向のずれ（px） */
  | { kind: 'dragging'; offset: number }
  | { kind: 'open'; animateIn: boolean }
  | { kind: 'closing' };

interface Gesture {
  from: 'bar' | 'sheet';
  startY: number;
  startT: number;
  moved: boolean;
}

/**
 * スマホ用のプレビュー。普段は画面下の小さなバーで、
 * タップするか上に引き上げると大きなプレビューのシートが開く。
 */
export function PreviewSheet() {
  const token = useStore((s) => s.token);
  const addToQueue = useStore((s) => s.addToQueue);
  const vh = useWindowHeight();
  const sheetH = vh - TOP_GAP;
  const [state, setState] = useState<SheetState>({ kind: 'closed' });
  const gesture = useRef<Gesture | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  /** 「戻る」で閉じられるよう履歴を 1 つ積んでいるか */
  const pushed = useRef(false);

  const animateClose = () => {
    clearTimeout(closeTimer.current);
    setState({ kind: 'closing' });
    closeTimer.current = setTimeout(() => setState({ kind: 'closed' }), 260);
  };

  const open = (animateIn: boolean) => {
    clearTimeout(closeTimer.current);
    if (!pushed.current) {
      history.pushState({ mtgPreviewSheet: true }, '');
      pushed.current = true;
    }
    setState({ kind: 'open', animateIn });
  };

  const requestClose = () => {
    // 積んだ履歴を戻すと popstate で閉じる（端末の「戻る」と同じ流れにそろえる）
    if (pushed.current) history.back();
    else animateClose();
  };

  useEffect(() => {
    const onPop = () => {
      if (!pushed.current) return;
      pushed.current = false;
      animateClose();
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      clearTimeout(closeTimer.current);
    };
  }, []);

  // シートを出している間は後ろのページをスクロールさせない
  const visible = state.kind !== 'closed';
  useEffect(() => {
    if (!visible) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [visible]);

  const startGesture = (from: Gesture['from']) => (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = { from, startY: e.clientY, startT: performance.now(), moved: false };
  };

  const moveGesture = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const dy = e.clientY - g.startY; // 下向きが正
    if (!g.moved && Math.abs(dy) < 8) return;
    g.moved = true;
    const offset = g.from === 'bar' ? sheetH - BAR_H + dy : dy;
    setState({ kind: 'dragging', offset: Math.max(0, Math.min(sheetH, offset)) });
  };

  const endGesture = (e: React.PointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    const dy = e.clientY - g.startY;
    const velocity = dy / Math.max(1, performance.now() - g.startT); // px/ms、下向きが正
    if (g.from === 'bar') {
      if (!g.moved) open(true);
      else if (dy < -80 || velocity < -0.4) open(false);
      else animateClose();
    } else if (g.moved) {
      if (dy > 100 || velocity > 0.5) requestClose();
      else setState({ kind: 'open', animateIn: false });
    }
  };

  const cancelGesture = () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g?.moved) return;
    if (g.from === 'bar') animateClose();
    else setState({ kind: 'open', animateIn: false });
  };

  const previewMax = Math.max(160, ((sheetH - SHEET_CHROME) * CARD_W) / CARD_H);

  const sheetStyle: React.CSSProperties | undefined =
    state.kind === 'dragging' ? { transform: `translateY(${state.offset}px)`, transition: 'none' } : undefined;
  const sheetClass =
    state.kind === 'open' ? `sheet open ${state.animateIn ? 'animate-in' : ''}` : state.kind === 'closing' ? 'sheet closing' : 'sheet';
  const backdropOpacity =
    state.kind === 'dragging' ? 1 - state.offset / sheetH : state.kind === 'open' ? 1 : 0;

  return (
    <>
      <div
        className="sheet-bar"
        role="button"
        tabIndex={0}
        aria-label="プレビューを大きく表示"
        aria-expanded={state.kind === 'open'}
        onPointerDown={startGesture('bar')}
        onPointerMove={moveGesture}
        onPointerUp={endGesture}
        onPointerCancel={cancelGesture}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open(true);
          }
        }}
      >
        <span className="sheet-handle" aria-hidden />
        <div className="sheet-thumb">
          <CardCanvas token={token} width={58} />
        </div>
        <div className="sheet-info">
          <strong>{token.name || '（名前なし）'}</strong>
          <span>{token.typeLine}</span>
          <small>タップ・上にスワイプで拡大</small>
        </div>
        <button
          type="button"
          className="btn small primary sheet-add"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => addToQueue(token, 1)}
        >
          ＋印刷
        </button>
      </div>

      {visible && (
        <>
          <div className="sheet-backdrop" style={{ opacity: backdropOpacity }} onClick={requestClose} aria-hidden />
          <div className={sheetClass} style={sheetStyle} role="dialog" aria-modal="true" aria-label="プレビュー">
            <div
              className="sheet-head"
              onPointerDown={startGesture('sheet')}
              onPointerMove={moveGesture}
              onPointerUp={endGesture}
              onPointerCancel={cancelGesture}
            >
              <span className="sheet-handle" aria-hidden />
              <span className="sheet-title">プレビュー</span>
              <button type="button" className="btn small" onPointerDown={(e) => e.stopPropagation()} onClick={requestClose}>
                閉じる
              </button>
            </div>
            <div className="sheet-body">
              <Preview maxWidth={previewMax} />
              <p className="hint">
                {token.artId ? 'イラストはドラッグで移動、ピンチで拡大縮小できます' : 'カードをタップしてイラストを選べます'}
              </p>
              <PreviewActions />
            </div>
          </div>
        </>
      )}
    </>
  );
}
