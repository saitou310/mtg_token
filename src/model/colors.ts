export type ManaColor = 'W' | 'U' | 'B' | 'R' | 'G';
export type PaletteKey = ManaColor | 'gold' | 'colorless' | 'artifact' | 'land';
export type FrameStyle = 'auto' | 'hybrid' | 'custom';

export const MANA_COLORS: ManaColor[] = ['W', 'U', 'B', 'R', 'G'];

export interface Palette {
  label: string;
  /** 枠の基本色 */
  frame: string;
  frameDark: string;
  frameLight: string;
  /** 枠の縁取り線（混色時はここが色分けされる） */
  pinline: string;
  /** 名前・タイプ行の帯 */
  bar: string;
  textbox: string;
  /** UIのボタン用 */
  swatch: string;
}

export const PALETTES: Record<PaletteKey, Palette> = {
  W: {
    label: '白',
    frame: '#e6dfca',
    frameDark: '#a89c7c',
    frameLight: '#fbf8ee',
    pinline: '#efe8cf',
    bar: '#f1ede1',
    textbox: '#f2efe6',
    swatch: '#f8f6d8',
  },
  U: {
    label: '青',
    frame: '#1d6aa6',
    frameDark: '#0b3a63',
    frameLight: '#62a5d8',
    pinline: '#1e78bd',
    bar: '#c3d7e8',
    textbox: '#d6e4f0',
    swatch: '#0e68ab',
  },
  B: {
    label: '黒',
    frame: '#36302d',
    frameDark: '#141110',
    frameLight: '#6a625d',
    pinline: '#3b3431',
    bar: '#c9c2bd',
    textbox: '#d8d2ce',
    swatch: '#2b2522',
  },
  R: {
    label: '赤',
    frame: '#c4462d',
    frameDark: '#761c10',
    frameLight: '#ec8f6e',
    pinline: '#d64a2c',
    bar: '#efc8b3',
    textbox: '#f3dbce',
    swatch: '#d3202a',
  },
  G: {
    label: '緑',
    frame: '#2f7a4b',
    frameDark: '#12452a',
    frameLight: '#72ae80',
    pinline: '#2b8752',
    bar: '#c7dbc9',
    textbox: '#d9e7da',
    swatch: '#00733e',
  },
  gold: {
    label: 'ゴールド',
    frame: '#d2af57',
    frameDark: '#8f6f22',
    frameLight: '#f4df98',
    pinline: '#dcbb62',
    bar: '#ebd9a3',
    textbox: '#f1e6c6',
    swatch: '#d9b653',
  },
  colorless: {
    label: '無色',
    frame: '#c6c4c0',
    frameDark: '#86837e',
    frameLight: '#eeedea',
    pinline: '#bab7b2',
    bar: '#dfddd9',
    textbox: '#e9e8e5',
    swatch: '#c8c4c0',
  },
  artifact: {
    label: 'アーティファクト',
    frame: '#97a4ae',
    frameDark: '#56626b',
    frameLight: '#d3dbe1',
    pinline: '#a7b2ba',
    bar: '#d3dae0',
    textbox: '#e1e6ea',
    swatch: '#9ba5ae',
  },
  land: {
    label: '土地',
    frame: '#a4875e',
    frameDark: '#665234',
    frameLight: '#d4bf97',
    pinline: '#b29571',
    bar: '#ddcfb5',
    textbox: '#e9dfcc',
    swatch: '#a1835c',
  },
};

export const PALETTE_KEYS = Object.keys(PALETTES) as PaletteKey[];

/** 色の組み合わせごとの正式な並び順（左→右） */
const CANONICAL_ORDERS: string[] = [
  'W', 'U', 'B', 'R', 'G',
  'WU', 'UB', 'BR', 'RG', 'GW', 'WB', 'UR', 'BG', 'RW', 'GU',
  'WUB', 'UBR', 'BRG', 'RGW', 'GWU', 'WBG', 'URW', 'BGU', 'RWB', 'GUR',
  'WUBR', 'UBRG', 'BRGW', 'RGWU', 'GWUB',
  'WUBRG',
];

function setKey(colors: Iterable<ManaColor>): string {
  return MANA_COLORS.filter((c) => [...colors].includes(c)).join('');
}

const ORDER_BY_SET = new Map(CANONICAL_ORDERS.map((o) => [setKey(o.split('') as ManaColor[]), o]));

/** 重複を除き、MTGの正式な色順に並べ替える */
export function canonicalOrder(colors: Iterable<ManaColor>): ManaColor[] {
  const key = setKey(colors);
  if (!key) return [];
  return (ORDER_BY_SET.get(key) ?? key).split('') as ManaColor[];
}

/** 部位ごとの色（各部位1〜3色。複数色なら左→右のグラデーション） */
export interface PartColors {
  frame: PaletteKey[];
  pinline: PaletteKey[];
  bars: PaletteKey[];
  textbox: PaletteKey[];
  pt: PaletteKey[];
}

export const PART_LABELS: Record<keyof PartColors, string> = {
  frame: '枠',
  pinline: '縁取り線',
  bars: '名前・タイプ帯',
  textbox: 'テキスト欄',
  pt: 'P/T欄',
};

export interface ColorSpec {
  colors: ManaColor[];
  isArtifact: boolean;
  isLand: boolean;
  frameStyle: FrameStyle;
  customColors: PartColors;
}

function uniform(key: PaletteKey): PartColors {
  return { frame: [key], pinline: [key], bars: [key], textbox: [key], pt: [key] };
}

/** トークンの色指定から、実際に描画する部位ごとの色を決める */
export function resolvePartColors(spec: ColorSpec): PartColors {
  if (spec.frameStyle === 'custom') return spec.customColors;

  const cs = canonicalOrder(spec.colors);
  const base: PaletteKey | null = spec.isLand ? 'land' : spec.isArtifact ? 'artifact' : null;

  if (cs.length === 0) return uniform(base ?? 'colorless');

  // 3色以上はピンラインもゴールド（本物準拠）。ハイブリッドは3色までグラデ
  const pin: PaletteKey[] = cs.length <= 2 ? cs : ['gold'];

  if (spec.frameStyle === 'hybrid' && cs.length >= 2) {
    const hy = cs.slice(0, 3);
    if (base) return { frame: [base], pinline: hy, bars: hy, textbox: hy, pt: [hy[hy.length - 1]] };
    return { frame: hy, pinline: hy, bars: hy, textbox: hy, pt: [hy[hy.length - 1]] };
  }

  // 自動（本物準拠）
  if (base) {
    return { frame: [base], pinline: pin, bars: [base], textbox: [base], pt: [base] };
  }
  if (cs.length === 1) return uniform(cs[0]);
  return { frame: ['gold'], pinline: pin, bars: ['gold'], textbox: ['gold'], pt: ['gold'] };
}

/** 2〜3色を左→右に配置するグラデーションの色停止点 */
export function gradientStops(keys: PaletteKey[], pick: (p: Palette) => string): [number, string][] {
  const colors = keys.map((k) => pick(PALETTES[k]));
  if (colors.length <= 1) return [[0, colors[0] ?? '#888']];
  if (colors.length === 2) {
    return [
      [0, colors[0]],
      [0.4, colors[0]],
      [0.6, colors[1]],
      [1, colors[1]],
    ];
  }
  const n = colors.length;
  const stops: [number, string][] = [];
  colors.forEach((c, i) => {
    const start = i / n;
    const end = (i + 1) / n;
    const blend = 0.07;
    stops.push([i === 0 ? 0 : start + blend, c], [i === n - 1 ? 1 : end - blend, c]);
  });
  return stops;
}
