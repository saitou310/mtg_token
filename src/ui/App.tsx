import { useEffect } from 'react';
import { useStore, type Tab } from '../state/store';
import { useHideOnScroll } from './hooks';
import { EditorPage } from './editor/EditorPage';
import { HelpPage } from './HelpPage';
import { LibraryPage } from './LibraryPage';
import { PrintPage } from './PrintPage';

export function App() {
  const tab = useStore((s) => s.tab);
  const loaded = useStore((s) => s.loaded);
  const queueCount = useStore((s) => s.queue.reduce((n, q) => n + q.count, 0));
  const libraryCount = useStore((s) => s.library.length);
  const toast = useStore((s) => s.toast);
  const setTab = useStore((s) => s.setTab);
  const headerHidden = useHideOnScroll();

  // 画面を切り替えたら先頭から表示する（ヘッダーも出る）
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'editor', label: '作成' },
    { id: 'library', label: 'マイトークン', badge: libraryCount },
    { id: 'print', label: '印刷', badge: queueCount },
    { id: 'help', label: '使い方' },
  ];

  return (
    <div className="app">
      <header className={`app-header ${headerHidden ? 'is-hidden' : ''}`}>
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <span>
            MTG トークンメーカー
            <small>非公式ファンツール</small>
          </span>
        </div>
        <nav className="tabs" aria-label="画面">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? 'on' : ''}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {!!t.badge && <span className="badge">{t.badge}</span>}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {!loaded ? (
          <div className="empty">読み込み中…</div>
        ) : tab === 'editor' ? (
          <EditorPage />
        ) : tab === 'library' ? (
          <LibraryPage />
        ) : tab === 'print' ? (
          <PrintPage />
        ) : (
          <HelpPage />
        )}
      </main>

      <footer className="app-footer">
        非公式ファンコンテンツです。Wizards of the Coast とは関係なく、承認も受けていません。Magic: The Gathering は Wizards of the Coast LLC の商標です。画像や入力内容はこの端末のブラウザ内にのみ保存されます。
      </footer>

      {toast && (
        <div className="toast" role="status">
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.action!.run();
                useStore.getState().dismissToast();
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
