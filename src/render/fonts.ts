import type { FontSettings } from '../model/token';

export interface ResolvedFonts {
  /** トークン名・タイプ行・P/T */
  title: string;
  /** 能力・フレーバー */
  rules: string;
  titleWeight: number;
}

const q = (name: string) => `"${name.replace(/"/g, '')}"`;

export function resolveFonts(f: FontSettings): ResolvedFonts {
  switch (f.preset) {
    case 'sans':
      return { title: `${q('Noto Sans JP')}, sans-serif`, rules: `${q('Noto Sans JP')}, sans-serif`, titleWeight: 700 };
    case 'custom': {
      const title = f.customTitle.trim();
      const rules = f.customRules.trim();
      return {
        title: `${title ? q(title) + ', ' : ''}${q('Noto Sans JP')}, sans-serif`,
        rules: `${rules ? q(rules) + ', ' : ''}${q('EB Garamond')}, ${q('Noto Serif JP')}, serif`,
        titleWeight: 700,
      };
    }
    case 'serif':
    default:
      return {
        title: `${q('Noto Sans JP')}, sans-serif`,
        rules: `${q('EB Garamond')}, ${q('Noto Serif JP')}, serif`,
        titleWeight: 700,
      };
  }
}

export function fontString(family: string, size: number, opts: { weight?: number; italic?: boolean } = {}): string {
  return `${opts.italic ? 'italic ' : ''}${opts.weight ?? 400} ${size}px ${family}`;
}

/**
 * Canvas で使う前に、必要な字形のフォントを読み込んでおく。
 * （@fontsource は unicode-range 分割なので、使う文字を渡すと必要な分だけ取得される）
 */
export async function ensureFonts(fonts: ResolvedFonts, texts: { title: string; rules: string }): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const families = (stack: string) => stack.split(',').map((s) => s.trim()).filter((s) => s.startsWith('"'));
  const jobs: Promise<unknown>[] = [];
  for (const fam of families(fonts.title)) {
    jobs.push(document.fonts.load(fontString(fam, 20, { weight: fonts.titleWeight }), texts.title || 'A'));
  }
  for (const fam of families(fonts.rules)) {
    jobs.push(document.fonts.load(fontString(fam, 20), texts.rules || 'A'));
    jobs.push(document.fonts.load(fontString(fam, 20, { italic: true }), texts.rules || 'A'));
  }
  await Promise.allSettled(jobs);
}
