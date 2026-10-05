import { useEffect, useState } from 'react';
import { downloadFile, loadExporter } from '../../print/download';
import { useStore } from '../../state/store';
import { Stepper } from '../common';
import { AdvancedSection } from './AdvancedSection';
import { ArtSection } from './ArtSection';
import { isImageFile, setArtFromFile } from './art';
import { ColorSection } from './ColorSection';
import { PresetSection } from './PresetSection';
import { Preview } from './Preview';
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
  const token = useStore((s) => s.token);
  const library = useStore((s) => s.library);
  const { addToQueue, saveToLibrary, newToken, showToast } = useStore.getState();
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const saved = library.find((x) => x.id === token.id);
  const dirty = !saved || saved.updatedAt !== token.updatedAt;

  const onNew = () => {
    if (dirty && !confirm('編集中のトークンはマイトークンに保存されていません。新しく作り始めますか？')) return;
    newToken();
  };

  const onPng = async () => {
    setBusy(true);
    try {
      const { exportCardPng } = await loadExporter();
      const f = await exportCardPng(token, true);
      downloadFile(f, f.name);
    } catch (e) {
      console.error(e);
      showToast('画像の書き出しに失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="editor">
      <div className="editor-form">
        <PresetSection />
        <TextSection />
        <ColorSection />
        <ArtSection />
        <AdvancedSection />
      </div>
      <aside className="editor-preview">
        <Preview />
        <div className="preview-actions">
          <div className="row gap align-center">
            <Stepper value={count} onChange={setCount} />
            <button type="button" className="btn primary grow" onClick={() => addToQueue(token, count)}>
              印刷リストに追加
            </button>
          </div>
          <div className="row gap">
            <button type="button" className="btn grow" onClick={saveToLibrary}>
              {saved ? (dirty ? 'マイトークンを上書き保存' : '保存済み ✓') : 'マイトークンに保存'}
            </button>
            <button type="button" className="btn" onClick={onPng} disabled={busy}>
              PNG
            </button>
            <button type="button" className="btn" onClick={onNew}>
              新規
            </button>
          </div>
        </div>
      </aside>
      {dragging && (
        <div className="drop-overlay" aria-hidden>
          <div>ドロップしてイラストに設定</div>
        </div>
      )}
    </div>
  );
}
