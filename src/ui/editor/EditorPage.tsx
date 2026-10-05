import { useEffect, useState } from 'react';
import { useStore } from '../../state/store';
import { COMPACT_QUERY, useMediaQuery } from '../hooks';
import { AdvancedSection } from './AdvancedSection';
import { ArtSection } from './ArtSection';
import { isImageFile, setArtFromFile } from './art';
import { ColorSection } from './ColorSection';
import { PresetSection } from './PresetSection';
import { Preview } from './Preview';
import { PreviewActions } from './PreviewActions';
import { PreviewSheet } from './PreviewSheet';
import { TextSection } from './TextSection';

/** ページ全体で画像のドロップ・貼り付けを受け付ける */
function useGlobalImageInput(): boolean {
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => [...(e.dataTransfer?.types ?? [])].includes('Files');
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      const f = [...(e.dataTransfer?.files ?? [])].find(isImageFile);
      if (f) setArtFromFile(f);
      else useStore.getState().showToast('画像ファイルをドロップしてください');
    };
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.kind === 'file' && i.type.startsWith('image/'));
      if (!item) return;
      // テキスト入力中でも画像の貼り付けはイラストとして扱う
      const f = item.getAsFile();
      if (!f) return;
      e.preventDefault();
      target?.blur?.();
      setArtFromFile(f);
    };
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDrop);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('paste', onPaste);
    };
  }, []);
  return dragging;
}

export function EditorPage() {
  const dragging = useGlobalImageInput();
  // スマホなど 1 カラムのときは、プレビューを画面下の引き出し（シート）にする
  const compact = useMediaQuery(COMPACT_QUERY);

  return (
    <div className="editor">
      <div className="editor-form">
        <PresetSection />
        <TextSection />
        <ColorSection />
        <ArtSection />
        <AdvancedSection />
      </div>
      {compact ? (
        <PreviewSheet />
      ) : (
        <aside className="editor-preview">
          <Preview />
          <PreviewActions />
        </aside>
      )}
      {dragging && (
        <div className="drop-overlay" aria-hidden>
          <div>ドロップしてイラストに設定</div>
        </div>
      )}
    </div>
  );
}
