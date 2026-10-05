import { del, get, set } from 'idb-keyval';

// すべてブラウザ内（IndexedDB）に保存。サーバーには何も送らない
export const KEYS = {
  current: 'current',
  library: 'library',
  queue: 'queue',
  print: 'printSettings',
  image: (id: string) => `img:${id}`,
} as const;

export async function load<T>(key: string): Promise<T | undefined> {
  try {
    return await get<T>(key);
  } catch (e) {
    console.warn('load failed', key, e);
    return undefined;
  }
}

export async function save<T>(key: string, value: T): Promise<void> {
  try {
    await set(key, value);
  } catch (e) {
    console.warn('save failed', key, e);
  }
}

export async function remove(key: string): Promise<void> {
  try {
    await del(key);
  } catch (e) {
    console.warn('remove failed', key, e);
  }
}
