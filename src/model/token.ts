import type { FrameStyle, ManaColor, PartColors } from './colors';

export type CardLang = 'ja' | 'en';
export type FontPreset = 'serif' | 'sans' | 'custom';

/** イラストの配置。基準はフルアート領域に「隙間なく敷き詰めた」状態 */
export interface ArtTransform {
  /** 画像中心のずれ（カード座標単位 = 0.1mm） */
  x: number;
  y: number;
  /** 1 = 領域を覆う最小倍率 */
  scale: number;
}

export interface FontSettings {
  preset: FontPreset;
  /** preset が custom のときに使う、端末にインストール済みのフォント名 */
  customTitle: string;
  customRules: string;
}

export interface TokenData {
  id: string;
  name: string;
  typeLine: string;
  colors: ManaColor[];
  isArtifact: boolean;
  isLand: boolean;
  frameStyle: FrameStyle;
  customColors: PartColors;
  showPT: boolean;
  power: string;
  toughness: string;
  rules: string;
  flavor: string;
  artist: string;
  footer: string;
  fullArt: boolean;
  artId: string | null;
  artTransform: ArtTransform;
  setSymbolId: string | null;
  overlayId: string | null;
  /** 枠オーバーレイ使用時に自前の枠描画を省く */
  overlayReplacesFrame: boolean;
  fonts: FontSettings;
  lang: CardLang;
  updatedAt: number;
}

export function newId(): string {
  return crypto.randomUUID();
}

export const DEFAULT_ART_TRANSFORM: ArtTransform = { x: 0, y: 0, scale: 1 };

export function createToken(overrides: Partial<TokenData> = {}): TokenData {
  return {
    id: newId(),
    name: '兵士',
    typeLine: 'トークン・クリーチャー — 兵士',
    colors: ['W'],
    isArtifact: false,
    isLand: false,
    frameStyle: 'auto',
    customColors: {
      frame: ['gold'],
      pinline: ['W', 'U'],
      bars: ['gold'],
      textbox: ['gold'],
      pt: ['gold'],
    },
    showPT: true,
    power: '1',
    toughness: '1',
    rules: '',
    flavor: '',
    artist: '',
    footer: '',
    fullArt: false,
    artId: null,
    artTransform: { ...DEFAULT_ART_TRANSFORM },
    setSymbolId: null,
    overlayId: null,
    overlayReplacesFrame: false,
    fonts: { preset: 'serif', customTitle: '', customRules: '' },
    lang: 'ja',
    updatedAt: Date.now(),
    ...overrides,
  };
}

/** 別IDの複製を作る（画像IDは共有してよい：画像は不変） */
export function cloneToken(t: TokenData): TokenData {
  return structuredClone({ ...t, id: newId(), updatedAt: Date.now() });
}

/** 古い保存データに後から増えた項目を補う */
export function normalizeToken(t: Partial<TokenData>): TokenData {
  const base = createToken();
  return {
    ...base,
    ...t,
    customColors: { ...base.customColors, ...t.customColors },
    artTransform: { ...base.artTransform, ...t.artTransform },
    fonts: { ...base.fonts, ...t.fonts },
  } as TokenData;
}
