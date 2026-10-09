import { useState } from 'react';
import { track } from '../../analytics';
import { downloadFile, loadExporter } from '../../print/download';
import { useStore } from '../../state/store';
import { Stepper } from '../common';

/** プレビューの下に置く操作ボタン（印刷リストへ追加・保存・PNG・新規） */
export function PreviewActions() {
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
      track('export_png');
    } catch (e) {
      console.error(e);
      showToast('画像の書き出しに失敗しました');
    } finally {
      setBusy(false);
    }
  };

  return (
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
  );
}
