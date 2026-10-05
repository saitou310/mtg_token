import type { Paragraph, SymbolName } from './parse';

/** 文字幅を測る関数（単位はカード座標） */
export type MeasureFn = (text: string, italic: boolean, fontSize: number) => number;

export interface TextStyle {
  fontSize: number;
  /** 行の高さ（fontSize に対する倍率） */
  lineHeight: number;
  /** 段落間の追加余白（fontSize に対する倍率） */
  paragraphGap: number;
  /** 能力とフレーバーの間の余白（区切り線を含む、fontSize に対する倍率） */
  flavorGap: number;
  /** 記号の直径（fontSize に対する倍率） */
  symbolScale: number;
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontSize: 30,
  lineHeight: 1.32,
  paragraphGap: 0.35,
  flavorGap: 1.0,
  symbolScale: 0.92,
};

export type LineItem =
  | { kind: 'text'; text: string; italic: boolean; x: number; w: number }
  | { kind: 'symbol'; name: SymbolName; x: number; w: number };

export interface LaidLine {
  items: LineItem[];
  /** ベースラインの y（レイアウト上端からの距離） */
  baseline: number;
  width: number;
  flavor: boolean;
}

export interface TextLayout {
  lines: LaidLine[];
  height: number;
  fontSize: number;
  /** 能力とフレーバーの区切り線の y（無ければ null） */
  dividerY: number | null;
  /** 1単語が幅に収まらずはみ出したか */
  overflowX: boolean;
}

/** 行頭に来てはいけない文字 */
const NO_LINE_START = new Set(
  '、。，．,.)）」』】〕〉》］｝!?！？：；:;ー・ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ々〻ゝゞヽヾ…‥”’'.split(''),
);
/** 行末に来てはいけない文字 */
const NO_LINE_END = new Set('(（「『【〔〈《［｛“‘'.split(''));

/** 和文（文字単位で改行できる）文字か */
export function isCJK(ch: string): boolean {
  const c = ch.codePointAt(0) ?? 0;
  return (
    (c >= 0x3000 && c <= 0x30ff) || // 記号・かな
    (c >= 0x3400 && c <= 0x9fff) || // 漢字
    (c >= 0xf900 && c <= 0xfaff) ||
    (c >= 0xff00 && c <= 0xffef) || // 全角英数・記号
    c === 0x2014 || // —
    c === 0x2026 // …
  );
}

interface Atom {
  kind: 'text' | 'symbol';
  text: string;
  name?: SymbolName;
  italic: boolean;
  /** 行末に来たときに捨てる末尾の空白 */
  trailingSpace: boolean;
}

/** 段落を「これ以上分割しない最小単位」に分ける */
function toAtoms(p: Paragraph): Atom[] {
  const atoms: Atom[] = [];
  for (const run of p.runs) {
    if (run.kind === 'symbol') {
      atoms.push({ kind: 'symbol', text: '', name: run.name, italic: false, trailingSpace: false });
      continue;
    }
    let word = '';
    const pushWord = () => {
      if (word) atoms.push({ kind: 'text', text: word, italic: run.italic, trailingSpace: false });
      word = '';
    };
    for (const ch of run.text) {
      if (ch === ' ') {
        word += ch;
        pushWord();
        atoms[atoms.length - 1].trailingSpace = true;
      } else if (isCJK(ch)) {
        pushWord();
        atoms.push({ kind: 'text', text: ch, italic: run.italic, trailingSpace: false });
      } else {
        word += ch;
      }
    }
    pushWord();
  }
  return atoms;
}

/** 禁則処理：分割してはいけない原子同士をまとめる */
function toUnits(atoms: Atom[]): Atom[][] {
  const units: Atom[][] = [];
  let glueNext = false;
  for (const a of atoms) {
    const first = a.text[0] ?? '';
    const prev = units[units.length - 1];
    const prevAtom = prev?.[prev.length - 1];
    const attachToPrev =
      prev &&
      (glueNext ||
        (a.kind === 'text' && NO_LINE_START.has(first)) ||
        // 記号の連続（{2}{W}）や記号直後の欧文（{T}:）は分けない
        (prevAtom?.kind === 'symbol' && (a.kind === 'symbol' || !isCJK(first))));
    if (attachToPrev) prev.push(a);
    else units.push([a]);
    const last = a.text[a.text.length - 1] ?? '';
    glueNext = a.kind === 'text' && NO_LINE_END.has(last);
  }
  return units;
}

export function layoutText(paras: Paragraph[], maxWidth: number, style: TextStyle, measure: MeasureFn): TextLayout {
  const fs = style.fontSize;
  const lineBox = fs * style.lineHeight;
  const symW = fs * style.symbolScale;
  const symGap = fs * 0.06;
  const spaceW = (italic: boolean) => measure(' ', italic, fs);

  const atomWidth = (a: Atom) => (a.kind === 'symbol' ? symW + symGap * 2 : measure(a.text, a.italic, fs));
  const atomTrimmedWidth = (a: Atom) =>
    a.kind === 'text' && a.trailingSpace ? measure(a.text.trimEnd(), a.italic, fs) : atomWidth(a);

  const lines: LaidLine[] = [];
  let y = 0;
  let dividerY: number | null = null;
  let overflowX = false;
  let prevFlavor: boolean | null = null;

  for (const p of paras) {
    if (prevFlavor !== null) {
      if (p.flavor && !prevFlavor) {
        dividerY = y + (fs * style.flavorGap) / 2;
        y += fs * style.flavorGap;
      } else {
        y += fs * style.paragraphGap;
      }
    }
    prevFlavor = p.flavor;

    const units = toUnits(toAtoms(p));
    let current: Atom[] = [];
    let currentW = 0;

    const emit = () => {
      // 行末の空白は除いて配置
      const items: LineItem[] = [];
      let x = 0;
      current.forEach((a, i) => {
        const isLast = i === current.length - 1;
        const w = isLast ? atomTrimmedWidth(a) : atomWidth(a);
        if (a.kind === 'symbol') {
          items.push({ kind: 'symbol', name: a.name!, x: x + symGap, w: symW });
        } else {
          const text = isLast ? a.text.trimEnd() : a.text;
          const prev = items[items.length - 1];
          if (prev && prev.kind === 'text' && prev.italic === a.italic) {
            prev.text += text;
            prev.w += w;
          } else {
            items.push({ kind: 'text', text, italic: a.italic, x, w });
          }
        }
        x += w;
      });
      if (x > maxWidth + 0.01) overflowX = true;
      const baseline = y + fs * 0.82 + ((style.lineHeight - 1) * fs) / 2;
      lines.push({ items, baseline, width: x, flavor: p.flavor });
      y += lineBox;
      current = [];
      currentW = 0;
    };

    for (const unit of units) {
      const unitW = unit.reduce((s, a) => s + atomWidth(a), 0);
      const lastAtom = unit[unit.length - 1];
      const trimmedW = unitW - (lastAtom.kind === 'text' && lastAtom.trailingSpace ? spaceW(lastAtom.italic) : 0);
      if (current.length > 0 && currentW + trimmedW > maxWidth) emit();
      current.push(...unit);
      currentW += unitW;
    }
    if (current.length > 0) emit();
  }

  return { lines, height: y, fontSize: fs, dividerY, overflowX };
}

/**
 * maxHeight に収まる最大の文字サイズでレイアウトする。
 * どうしても収まらなければ最小サイズの結果を返す。
 */
export function fitText(
  paras: Paragraph[],
  maxWidth: number,
  maxHeight: number,
  style: TextStyle,
  measure: MeasureFn,
  minFontSize: number,
): TextLayout {
  let size = style.fontSize;
  let result = layoutText(paras, maxWidth, style, measure);
  while ((result.height > maxHeight || result.overflowX) && size > minFontSize) {
    size = Math.max(minFontSize, size - 1);
    result = layoutText(paras, maxWidth, { ...style, fontSize: size }, measure);
  }
  return result;
}
