import { track } from '../analytics';
import { cloneToken } from '../model/token';
import { downloadFile } from '../print/download';
import { useStore } from '../state/store';
import { exportBackup, importBackup } from '../storage/backup';
import { CardCanvas } from './CardCanvas';
import { FileButton } from './common';

export function LibraryPage() {
  const library = useStore((s) => s.library);
  const { setToken, setTab, addToQueue, removeFromLibrary, importToLibrary, showToast } = useStore.getState();

  const onExport = async () => {
    const blob = await exportBackup(library);
    downloadFile(blob, `mtg_tokens_backup_${new Date().toISOString().slice(0, 10)}.json`);
    track('backup_export', { count: library.length });
  };

  const onImport = async (f: File) => {
    try {
      const tokens = await importBackup(f);
      importToLibrary(tokens);
      track('backup_import', { count: tokens.length });
      showToast(`${tokens.length} 件のトークンを読み込みました`);
    } catch (e) {
      showToast((e as Error).message || '読み込みに失敗しました');
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>マイトークン</h1>
          <p className="hint">保存したトークンはこのブラウザの中にだけ保存されます。別の端末へ移すときはバックアップを使ってください。</p>
        </div>
        <div className="row gap wrap">
          <button type="button" className="btn" onClick={onExport} disabled={library.length === 0}>
            バックアップを書き出す
          </button>
          <FileButton accept="application/json,.json" onFile={onImport}>
            バックアップを読み込む
          </FileButton>
        </div>
      </div>

      {library.length === 0 ? (
        <div className="empty">
          <p>まだ保存されたトークンはありません。</p>
          <button type="button" className="btn primary" onClick={() => setTab('editor')}>
            トークンを作る
          </button>
        </div>
      ) : (
        <ul className="card-grid">
          {library.map((t) => (
            <li key={t.id} className="card-tile">
              <button
                type="button"
                className="card-tile-art"
                onClick={() => {
                  setToken(t);
                  setTab('editor');
                }}
                aria-label={`${t.name} を編集`}
              >
                <CardCanvas token={t} width={180} />
              </button>
              <div className="card-tile-name">{t.name || '（名前なし）'}</div>
              <div className="card-tile-actions">
                <button
                  type="button"
                  className="btn small"
                  onClick={() => {
                    setToken(t);
                    setTab('editor');
                  }}
                >
                  編集
                </button>
                <button type="button" className="btn small" onClick={() => addToQueue(t, 1)}>
                  印刷へ
                </button>
                <button
                  type="button"
                  className="btn small"
                  onClick={() => {
                    setToken(cloneToken(t));
                    setTab('editor');
                  }}
                >
                  複製
                </button>
                <button
                  type="button"
                  className="btn small danger-outline"
                  onClick={() => confirm(`「${t.name}」を削除しますか？`) && removeFromLibrary(t.id)}
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
