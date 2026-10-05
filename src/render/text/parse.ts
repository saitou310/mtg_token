/** 能力テキスト中の {T} {W} {2} などの記号 */
export const SYMBOL_NAMES = [
  'W', 'U', 'B', 'R', 'G', 'C', 'S', 'X', 'Y', 'Z', 'E', 'P', 'T', 'Q',
  ...Array.from({ length: 21 }, (_, i) => String(i)),
] as const;

export type SymbolName = (typeof SYMBOL_NAMES)[number];

const SYMBOL_SET = new Set<string>(SYMBOL_NAMES);

export type Run =
  | { kind: 'text'; text: string; italic: boolean }
  | { kind: 'symbol'; name: SymbolName };

export interface Paragraph {
  runs: Run[];
  /** フレーバーテキスト段落（区切り線の下に斜体で描く） */
  flavor: boolean;
}

/** 記号表記を正規化（{t} → T, {UNTAP} → Q） */
function normalizeSymbol(raw: string): SymbolName | null {
  const s = raw.trim().toUpperCase();
  if (s === 'TAP') return 'T';
  if (s === 'UNTAP') return 'Q';
  return SYMBOL_SET.has(s) ? (s as SymbolName) : null;
}

/**
 * 1段落ぶんのテキストを記号と文字列に分ける。
 * 括弧内（半角/全角）の注釈文は italic 扱い。
 */
export function parseRuns(line: string, baseItalic = false): Run[] {
  const runs: Run[] = [];
  let depth = 0;
  let buf = '';
  const flush = () => {
    if (buf) runs.push({ kind: 'text', text: buf, italic: baseItalic || depth > 0 });
    buf = '';
  };
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '{') {
      const end = line.indexOf('}', i + 1);
      if (end > i) {
        const name = normalizeSymbol(line.slice(i + 1, end));
        if (name) {
          flush();
          runs.push({ kind: 'symbol', name });
          i = end;
          continue;
        }
      }
    }
    if (ch === '(' || ch === '（') {
      flush();
      depth++;
      buf += ch;
      continue;
    }
    if ((ch === ')' || ch === '）') && depth > 0) {
      buf += ch;
      flush();
      depth--;
      continue;
    }
    buf += ch;
  }
  flush();
  return runs;
}

/**
 * @param italicReminder 注釈文（括弧内）を斜体にするか。英語版カードは斜体、日本語版は斜体にしない
 */
export function parseCardText(rules: string, flavor: string, italicReminder = true): Paragraph[] {
  const paras: Paragraph[] = [];
  for (const line of rules.split(/\r?\n/)) {
    if (line.trim() === '') continue;
    const runs = parseRuns(line).map((r) => (r.kind === 'text' && !italicReminder ? { ...r, italic: false } : r));
    paras.push({ runs, flavor: false });
  }
  for (const line of flavor.split(/\r?\n/)) {
    if (line.trim() === '') continue;
    paras.push({ runs: parseRuns(line, true), flavor: true });
  }
  return paras;
}
