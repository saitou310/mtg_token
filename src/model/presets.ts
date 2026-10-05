import type { ManaColor } from './colors';
import type { CardLang, TokenData } from './token';

type Localized = Record<CardLang, string>;

export interface TokenPreset {
  key: string;
  name: Localized;
  /** タイプ行の「—」より後ろ（サブタイプ） */
  subtype: Localized;
  kind: 'creature' | 'artifact' | 'artifactCreature' | 'enchantment';
  colors: ManaColor[];
  pt?: [string, string];
  rules?: Localized;
}

const KIND_LABEL: Record<TokenPreset['kind'], Localized> = {
  creature: { ja: 'トークン・クリーチャー', en: 'Token Creature' },
  artifact: { ja: 'トークン・アーティファクト', en: 'Token Artifact' },
  artifactCreature: { ja: 'トークン・アーティファクト・クリーチャー', en: 'Token Artifact Creature' },
  enchantment: { ja: 'トークン・エンチャント', en: 'Token Enchantment' },
};

const kw = (ja: string, en: string): Localized => ({ ja, en });

export const PRESETS: TokenPreset[] = [
  { key: 'soldier', name: kw('兵士', 'Soldier'), subtype: kw('兵士', 'Soldier'), kind: 'creature', colors: ['W'], pt: ['1', '1'] },
  { key: 'spirit', name: kw('スピリット', 'Spirit'), subtype: kw('スピリット', 'Spirit'), kind: 'creature', colors: ['W'], pt: ['1', '1'], rules: kw('飛行', 'Flying') },
  { key: 'knight', name: kw('騎士', 'Knight'), subtype: kw('騎士', 'Knight'), kind: 'creature', colors: ['W'], pt: ['2', '2'], rules: kw('警戒', 'Vigilance') },
  { key: 'angel', name: kw('天使', 'Angel'), subtype: kw('天使', 'Angel'), kind: 'creature', colors: ['W'], pt: ['4', '4'], rules: kw('飛行', 'Flying') },
  { key: 'bird', name: kw('鳥', 'Bird'), subtype: kw('鳥', 'Bird'), kind: 'creature', colors: ['U'], pt: ['1', '1'], rules: kw('飛行', 'Flying') },
  { key: 'zombie', name: kw('ゾンビ', 'Zombie'), subtype: kw('ゾンビ', 'Zombie'), kind: 'creature', colors: ['B'], pt: ['2', '2'] },
  { key: 'vampire', name: kw('吸血鬼', 'Vampire'), subtype: kw('吸血鬼', 'Vampire'), kind: 'creature', colors: ['B'], pt: ['1', '1'], rules: kw('絆魂', 'Lifelink') },
  { key: 'goblin', name: kw('ゴブリン', 'Goblin'), subtype: kw('ゴブリン', 'Goblin'), kind: 'creature', colors: ['R'], pt: ['1', '1'] },
  { key: 'dragon', name: kw('ドラゴン', 'Dragon'), subtype: kw('ドラゴン', 'Dragon'), kind: 'creature', colors: ['R'], pt: ['4', '4'], rules: kw('飛行', 'Flying') },
  { key: 'saproling', name: kw('苗木', 'Saproling'), subtype: kw('苗木', 'Saproling'), kind: 'creature', colors: ['G'], pt: ['1', '1'] },
  { key: 'wolf', name: kw('狼', 'Wolf'), subtype: kw('狼', 'Wolf'), kind: 'creature', colors: ['G'], pt: ['2', '2'] },
  { key: 'beast', name: kw('ビースト', 'Beast'), subtype: kw('ビースト', 'Beast'), kind: 'creature', colors: ['G'], pt: ['3', '3'] },
  { key: 'elfWarrior', name: kw('エルフ・戦士', 'Elf Warrior'), subtype: kw('エルフ・戦士', 'Elf Warrior'), kind: 'creature', colors: ['G', 'W'], pt: ['1', '1'] },
  { key: 'thopter', name: kw('飛行機械', 'Thopter'), subtype: kw('飛行機械', 'Thopter'), kind: 'artifactCreature', colors: [], pt: ['1', '1'], rules: kw('飛行', 'Flying') },
  {
    key: 'treasure', name: kw('宝物', 'Treasure'), subtype: kw('宝物', 'Treasure'), kind: 'artifact', colors: [],
    rules: kw('{T}, このアーティファクトを生け贄に捧げる：好きな色1色のマナ1点を加える。', '{T}, Sacrifice this artifact: Add one mana of any color.'),
  },
  {
    key: 'clue', name: kw('手掛かり', 'Clue'), subtype: kw('手掛かり', 'Clue'), kind: 'artifact', colors: [],
    rules: kw('{2}, このアーティファクトを生け贄に捧げる：カードを1枚引く。', '{2}, Sacrifice this artifact: Draw a card.'),
  },
  {
    key: 'food', name: kw('食物', 'Food'), subtype: kw('食物', 'Food'), kind: 'artifact', colors: [],
    rules: kw('{2}, {T}, このアーティファクトを生け贄に捧げる：あなたは3点のライフを得る。', '{2}, {T}, Sacrifice this artifact: You gain 3 life.'),
  },
  {
    key: 'blood', name: kw('血', 'Blood'), subtype: kw('血', 'Blood'), kind: 'artifact', colors: [],
    rules: kw('{1}, {T}, カードを1枚捨てる, このアーティファクトを生け贄に捧げる：カードを1枚引く。', '{1}, {T}, Discard a card, Sacrifice this artifact: Draw a card.'),
  },
];

export function typeLineFor(kind: TokenPreset['kind'], subtype: string, lang: CardLang): string {
  const head = KIND_LABEL[kind][lang];
  return subtype ? `${head} — ${subtype}` : head;
}

/** プリセットを適用したときに上書きする項目 */
export function applyPreset(p: TokenPreset, lang: CardLang): Partial<TokenData> {
  const isCreature = p.kind === 'creature' || p.kind === 'artifactCreature';
  return {
    name: p.name[lang],
    typeLine: typeLineFor(p.kind, p.subtype[lang], lang),
    colors: [...p.colors],
    isArtifact: p.kind === 'artifact' || p.kind === 'artifactCreature',
    isLand: false,
    frameStyle: 'auto',
    showPT: isCreature,
    power: p.pt?.[0] ?? '',
    toughness: p.pt?.[1] ?? '',
    rules: p.rules?.[lang] ?? '',
    lang,
  };
}

export interface Keyword {
  ja: string;
  en: string;
}

export const KEYWORDS: Keyword[] = [
  { ja: '飛行', en: 'Flying' },
  { ja: '先制攻撃', en: 'First strike' },
  { ja: '二段攻撃', en: 'Double strike' },
  { ja: '接死', en: 'Deathtouch' },
  { ja: '速攻', en: 'Haste' },
  { ja: '警戒', en: 'Vigilance' },
  { ja: '絆魂', en: 'Lifelink' },
  { ja: 'トランプル', en: 'Trample' },
  { ja: '到達', en: 'Reach' },
  { ja: '威迫', en: 'Menace' },
  { ja: '呪禁', en: 'Hexproof' },
  { ja: '破壊不能', en: 'Indestructible' },
  { ja: '防衛', en: 'Defender' },
  { ja: '瞬速', en: 'Flash' },
  { ja: '果敢', en: 'Prowess' },
  { ja: '被覆', en: 'Shroud' },
  { ja: '感染', en: 'Infect' },
  { ja: '不死', en: 'Undying' },
  { ja: '頑強', en: 'Persist' },
];

function isKeywordLine(line: string): boolean {
  const parts = line.split(/、|,\s*/).map((s) => s.trim().toLowerCase());
  return parts.length > 0 && parts.every((p) => KEYWORDS.some((k) => k.ja === p || k.en.toLowerCase() === p));
}

/**
 * 能力欄にキーワード能力を追加する。
 * 最終行がキーワードだけなら「飛行、警戒」「Flying, vigilance」のように同じ行に並べる。
 */
export function appendKeyword(rules: string, k: Keyword, lang: CardLang): string {
  const word = k[lang];
  const trimmed = rules.replace(/\s+$/, '');
  if (!trimmed) return word;
  const lines = trimmed.split('\n');
  const last = lines[lines.length - 1];
  if (isKeywordLine(last)) {
    const already = last.split(/、|,\s*/).some((p) => p.trim().toLowerCase() === word.toLowerCase());
    if (already) return trimmed;
    lines[lines.length - 1] = lang === 'ja' ? `${last}、${word}` : `${last}, ${word.toLowerCase()}`;
    return lines.join('\n');
  }
  return `${trimmed}\n${word}`;
}
