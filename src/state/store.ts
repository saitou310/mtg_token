import { create } from 'zustand';
import { track } from '../analytics';
import { cloneToken, createToken, normalizeToken, type TokenData } from '../model/token';
import { DEFAULT_PRINT, type PrintSettings } from '../print/layouts';
import { KEYS, load, save } from '../storage/db';

export interface QueueItem {
  /** 印刷リストに入れた時点のスナップショット */
  token: TokenData;
  count: number;
}

export type Tab = 'editor' | 'library' | 'print' | 'help';

export interface Toast {
  message: string;
  /** 「元に戻す」などのボタン */
  action?: { label: string; run: () => void };
}

interface AppState {
  loaded: boolean;
  tab: Tab;
  token: TokenData;
  library: TokenData[];
  queue: QueueItem[];
  print: PrintSettings;
  toast: Toast | null;

  setTab(tab: Tab): void;
  update(patch: Partial<TokenData>): void;
  setToken(t: TokenData): void;
  newToken(): void;
  saveToLibrary(): void;
  removeFromLibrary(id: string): void;
  importToLibrary(tokens: TokenData[]): void;
  addToQueue(t: TokenData, count: number): void;
  setQueueCount(id: string, count: number): void;
  removeFromQueue(id: string): void;
  clearQueue(): void;
  setPrint(patch: Partial<PrintSettings>): void;
  showToast(msg: string, action?: Toast['action']): void;
  dismissToast(): void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useStore = create<AppState>((set, get) => ({
  loaded: false,
  tab: 'editor',
  token: createToken(),
  library: [],
  queue: [],
  print: DEFAULT_PRINT,
  toast: null,

  setTab: (tab) => set({ tab }),
  update: (patch) => set((s) => ({ token: { ...s.token, ...patch, updatedAt: Date.now() } })),
  setToken: (t) => set({ token: normalizeToken(t) }),
  newToken: () => set({ token: createToken() }),

  saveToLibrary: () => {
    const t = { ...get().token, updatedAt: Date.now() };
    set((s) => {
      const exists = s.library.some((x) => x.id === t.id);
      return {
        token: t,
        library: exists ? s.library.map((x) => (x.id === t.id ? t : x)) : [t, ...s.library],
      };
    });
    track('save_token');
    get().showToast('マイトークンに保存しました');
  },
  removeFromLibrary: (id) => set((s) => ({ library: s.library.filter((x) => x.id !== id) })),
  importToLibrary: (tokens) =>
    set((s) => {
      const ids = new Set(s.library.map((x) => x.id));
      const fresh = tokens.map(normalizeToken).map((t) => (ids.has(t.id) ? cloneToken(t) : t));
      return { library: [...fresh, ...s.library] };
    }),

  addToQueue: (t, count) => {
    set((s) => ({ queue: [...s.queue, { token: cloneToken(t), count }] }));
    // 色と枠は選択肢なので送ってよい（名前などの入力内容は送らない）
    track('add_to_queue', { count, colors: t.colors.join('') || 'C', frame: t.frameStyle, from: get().tab });
    get().showToast(`「${t.name || '名前なし'}」を印刷リストに ${count} 枚追加しました`);
  },
  setQueueCount: (id, count) =>
    set((s) => ({ queue: s.queue.map((q) => (q.token.id === id ? { ...q, count: Math.max(1, Math.min(99, count)) } : q)) })),
  removeFromQueue: (id) => set((s) => ({ queue: s.queue.filter((q) => q.token.id !== id) })),
  clearQueue: () => set({ queue: [] }),
  setPrint: (patch) => set((s) => ({ print: { ...s.print, ...patch } })),

  showToast: (message, action) => {
    clearTimeout(toastTimer);
    set({ toast: { message, action } });
    // ボタン付きは押す時間を考えて長めに出す
    toastTimer = setTimeout(() => set({ toast: null }), action ? 6000 : 2800);
  },
  dismissToast: () => {
    clearTimeout(toastTimer);
    set({ toast: null });
  },
}));

/** 保存データを読み込み、以後の変更を自動保存する */
export async function initPersistence(): Promise<void> {
  const [current, library, queue, print] = await Promise.all([
    load<TokenData>(KEYS.current),
    load<TokenData[]>(KEYS.library),
    load<QueueItem[]>(KEYS.queue),
    load<PrintSettings>(KEYS.print),
  ]);
  useStore.setState({
    loaded: true,
    token: current ? normalizeToken(current) : useStore.getState().token,
    library: (library ?? []).map(normalizeToken),
    queue: (queue ?? []).map((q) => ({ ...q, token: normalizeToken(q.token) })),
    print: { ...DEFAULT_PRINT, ...print },
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  useStore.subscribe((s, p) => {
    if (s.token === p.token && s.library === p.library && s.queue === p.queue && s.print === p.print) return;
    clearTimeout(timer);
    // 入力中に何度も書き込まないよう少し待つ
    timer = setTimeout(() => {
      const st = useStore.getState();
      save(KEYS.current, st.token);
      save(KEYS.library, st.library);
      save(KEYS.queue, st.queue);
      save(KEYS.print, st.print);
    }, 400);
  });
}
