import type { ManaColor } from './colors';
import type { CardLang, TokenData } from './token';

type Localized = Record<CardLang, string>;

export type PresetKind = 'creature' | 'artifact' | 'artifactCreature' | 'enchantment';

export interface TokenPreset {
  key: string;
  name: Localized;
  /** タイプ行の「—」より後ろ（サブタイプ） */
  subtype: Localized;
  kind: PresetKind;
  colors: ManaColor[];
  pt?: [string, string];
  rules?: Localized;
  /** 「定番」に出す */
  popular?: boolean;
}

const KIND_LABEL: Record<PresetKind, Localized> = {
  creature: { ja: 'トークン・クリーチャー', en: 'Token Creature' },
  artifact: { ja: 'トークン・アーティファクト', en: 'Token Artifact' },
  artifactCreature: { ja: 'トークン・アーティファクト・クリーチャー', en: 'Token Artifact Creature' },
  enchantment: { ja: 'トークン・エンチャント', en: 'Token Enchantment' },
};

const kw = (ja: string, en: string): Localized => ({ ja, en });

interface Def {
  colors?: string;
  pt?: string;
  rules?: Localized;
  popular?: boolean;
}

/** プリセット定義用。名前とサブタイプが同じ（トークンでは普通）ことを前提にする */
function preset(key: string, kind: PresetKind, ja: string, en: string, d: Def = {}): TokenPreset {
  return {
    key,
    name: kw(ja, en),
    subtype: kw(ja, en),
    kind,
    colors: [...(d.colors ?? '')] as ManaColor[],
    pt: d.pt ? (d.pt.split('/') as [string, string]) : undefined,
    rules: d.rules,
    popular: d.popular,
  };
}
const creature = (key: string, ja: string, en: string, d: Def) => preset(key, 'creature', ja, en, d);
const artifact = (key: string, ja: string, en: string, d: Def) => preset(key, 'artifact', ja, en, d);
const artifactCreature = (key: string, ja: string, en: string, d: Def) => preset(key, 'artifactCreature', ja, en, d);

const FLYING = kw('飛行', 'Flying');
const SAC_FOR_C = kw('このクリーチャーを生け贄に捧げる：{C}を加える。', 'Sacrifice this creature: Add {C}.');

// 能力文は印刷版の文面をもとにしたもの。版によって言い回しが違うことがあるので、必要なら編集して使ってもらう
export const PRESETS: TokenPreset[] = [
  // 白
  creature('soldier', '兵士', 'Soldier', { colors: 'W', pt: '1/1', popular: true }),
  creature('spirit', 'スピリット', 'Spirit', { colors: 'W', pt: '1/1', rules: FLYING, popular: true }),
  creature('human', '人間', 'Human', { colors: 'W', pt: '1/1' }),
  creature('cat', '猫', 'Cat', { colors: 'W', pt: '1/1' }),
  creature('warrior', '戦士', 'Warrior', { colors: 'W', pt: '1/1', rules: kw('警戒', 'Vigilance') }),
  creature('knight', '騎士', 'Knight', { colors: 'W', pt: '2/2', rules: kw('警戒', 'Vigilance') }),
  creature('angel', '天使', 'Angel', { colors: 'W', pt: '4/4', rules: FLYING, popular: true }),
  // 青
  creature('bird', '鳥', 'Bird', { colors: 'U', pt: '1/1', rules: FLYING }),
  creature('merfolk', 'マーフォーク', 'Merfolk', { colors: 'U', pt: '1/1' }),
  creature('faerie', 'フェアリー', 'Faerie', { colors: 'U', pt: '1/1', rules: FLYING }),
  creature('drake', 'ドレイク', 'Drake', { colors: 'U', pt: '2/2', rules: FLYING }),
  creature('illusion', 'イリュージョン', 'Illusion', {
    colors: 'U',
    pt: '2/2',
    rules: kw('このクリーチャーが呪文の対象になったとき、これを生け贄に捧げる。', 'When this creature becomes the target of a spell, sacrifice it.'),
  }),
  creature('kraken', 'クラーケン', 'Kraken', { colors: 'U', pt: '8/8' }),
  // 黒
  creature('zombie', 'ゾンビ', 'Zombie', { colors: 'B', pt: '2/2', popular: true }),
  creature('rat', 'ネズミ', 'Rat', { colors: 'B', pt: '1/1' }),
  creature('skeleton', 'スケルトン', 'Skeleton', { colors: 'B', pt: '1/1' }),
  creature('bat', 'コウモリ', 'Bat', { colors: 'B', pt: '1/1', rules: FLYING }),
  creature('vampire', '吸血鬼', 'Vampire', { colors: 'B', pt: '1/1', rules: kw('絆魂', 'Lifelink') }),
  creature('faerieRogue', 'フェアリー・ならず者', 'Faerie Rogue', { colors: 'B', pt: '1/1', rules: FLYING }),
  creature('pirate', '海賊', 'Pirate', { colors: 'B', pt: '2/2', rules: kw('威迫', 'Menace') }),
  creature('demon', 'デーモン', 'Demon', { colors: 'B', pt: '5/5', rules: FLYING }),
  // 赤
  creature('goblin', 'ゴブリン', 'Goblin', { colors: 'R', pt: '1/1', popular: true }),
  creature('elemental', 'エレメンタル', 'Elemental', { colors: 'R', pt: '1/1' }),
  creature('devil', 'デビル', 'Devil', {
    colors: 'R',
    pt: '1/1',
    rules: kw('このクリーチャーが死亡したとき、1つを対象とする。このクリーチャーはそれに1点のダメージを与える。', 'When this creature dies, it deals 1 damage to any target.'),
  }),
  creature('dragon', 'ドラゴン', 'Dragon', { colors: 'R', pt: '4/4', rules: FLYING, popular: true }),
  // 緑
  creature('saproling', '苗木', 'Saproling', { colors: 'G', pt: '1/1', popular: true }),
  creature('insect', '昆虫', 'Insect', { colors: 'G', pt: '1/1' }),
  creature('squirrel', 'リス', 'Squirrel', { colors: 'G', pt: '1/1' }),
  creature('snake', '蛇', 'Snake', { colors: 'G', pt: '1/1' }),
  creature('elfWarrior', 'エルフ・戦士', 'Elf Warrior', { colors: 'G', pt: '1/1' }),
  creature('plant', '植物', 'Plant', { colors: 'G', pt: '0/1' }),
  creature('spider', '蜘蛛', 'Spider', { colors: 'G', pt: '1/2', rules: kw('到達', 'Reach') }),
  creature('wolf', '狼', 'Wolf', { colors: 'G', pt: '2/2' }),
  creature('bear', '熊', 'Bear', { colors: 'G', pt: '2/2' }),
  creature('beast', 'ビースト', 'Beast', { colors: 'G', pt: '3/3', popular: true }),
  creature('elephant', '象', 'Elephant', { colors: 'G', pt: '3/3' }),
  creature('dinosaur', '恐竜', 'Dinosaur', { colors: 'G', pt: '3/3', rules: kw('トランプル', 'Trample') }),
  creature('wurm', 'ワーム', 'Wurm', { colors: 'G', pt: '6/6' }),
  // 多色
  creature('citizen', '市民', 'Citizen', { colors: 'GW', pt: '1/1' }),
  creature('spiritWB', 'スピリット', 'Spirit', { colors: 'WB', pt: '1/1', rules: FLYING }),
  creature('inkling', '墨獣', 'Inkling', { colors: 'WB', pt: '2/1', rules: FLYING }),
  creature('pest', '害獣', 'Pest', {
    colors: 'BG',
    pt: '1/1',
    rules: kw('このクリーチャーが死亡したとき、あなたは1点のライフを得る。', 'When this creature dies, you gain 1 life.'),
  }),
  creature('soldierRW', '兵士', 'Soldier', { colors: 'RW', pt: '1/1', rules: kw('速攻', 'Haste') }),
  creature('goblinSoldier', 'ゴブリン・兵士', 'Goblin Soldier', { colors: 'RW', pt: '1/1' }),
  // 無色・アーティファクト
  artifact('treasure', '宝物', 'Treasure', {
    rules: kw('{T}, このアーティファクトを生け贄に捧げる：好きな色1色のマナ1点を加える。', '{T}, Sacrifice this artifact: Add one mana of any color.'),
    popular: true,
  }),
  artifact('clue', '手掛かり', 'Clue', {
    rules: kw('{2}, このアーティファクトを生け贄に捧げる：カードを1枚引く。', '{2}, Sacrifice this artifact: Draw a card.'),
    popular: true,
  }),
  artifact('food', '食物', 'Food', {
    rules: kw('{2}, {T}, このアーティファクトを生け贄に捧げる：あなたは3点のライフを得る。', '{2}, {T}, Sacrifice this artifact: You gain 3 life.'),
    popular: true,
  }),
  artifact('blood', '血', 'Blood', {
    rules: kw('{1}, {T}, カードを1枚捨てる, このアーティファクトを生け贄に捧げる：カードを1枚引く。', '{1}, {T}, Discard a card, Sacrifice this artifact: Draw a card.'),
  }),
  artifact('map', '地図', 'Map', {
    rules: kw(
      '{1}, {T}, このアーティファクトを生け贄に捧げる：あなたがコントロールしているクリーチャー1体を対象とする。それは探検を行う。起動はソーサリーとしてのみ行う。',
      '{1}, {T}, Sacrifice this artifact: Target creature you control explores. Activate only as a sorcery.',
    ),
  }),
  artifact('gold', '金', 'Gold', {
    rules: kw('このアーティファクトを生け贄に捧げる：好きな色1色のマナ1点を加える。', 'Sacrifice this artifact: Add one mana of any color.'),
  }),
  artifact('powerstone', 'パワーストーン', 'Powerstone', {
    rules: kw('{T}：{C}を加える。このマナはアーティファクトでない呪文を唱えるために支払えない。', "{T}: Add {C}. This mana can't be spent to cast a nonartifact spell."),
  }),
  artifactCreature('thopter', '飛行機械', 'Thopter', { pt: '1/1', rules: FLYING, popular: true }),
  artifactCreature('servo', '霊気装置', 'Servo', { pt: '1/1' }),
  artifactCreature('golem', 'ゴーレム', 'Golem', { pt: '3/3' }),
  creature('eldraziSpawn', 'エルドラージ・落とし子', 'Eldrazi Spawn', { pt: '0/1', rules: SAC_FOR_C }),
  creature('eldraziScion', 'エルドラージ・末裔', 'Eldrazi Scion', { pt: '1/1', rules: SAC_FOR_C }),
  creature('shapeshifter', '多相の戦士', 'Shapeshifter', {
    pt: '2/2',
    rules: kw('多相（このカードはすべてのクリーチャー・タイプである。）', 'Changeling (This card is every creature type.)'),
  }),
];

export type PresetGroup = 'popular' | ManaColor | 'multi' | 'colorless';

export const PRESET_GROUPS: { id: PresetGroup; label: string }[] = [
  { id: 'popular', label: '定番' },
  { id: 'W', label: '白' },
  { id: 'U', label: '青' },
  { id: 'B', label: '黒' },
  { id: 'R', label: '赤' },
  { id: 'G', label: '緑' },
  { id: 'multi', label: '多色' },
  { id: 'colorless', label: '無色' },
];

/** 色による分類（「定番」は別枠なのでここでは返さない） */
export function colorGroupOf(p: TokenPreset): Exclude<PresetGroup, 'popular'> {
  if (p.colors.length === 0) return 'colorless';
  if (p.colors.length > 1) return 'multi';
  return p.colors[0];
}

export function presetsInGroup(g: PresetGroup): TokenPreset[] {
  return PRESETS.filter((p) => (g === 'popular' ? p.popular : colorGroupOf(p) === g));
}

/** 検索用の正規化：全角半角・大文字小文字・ひらがなカタカナの違いと「・」や空白を無視 */
export function normalizeForSearch(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60))
    .replace(/[\s・･·]/g, '');
}

const COLOR_WORDS: Record<ManaColor, string> = { W: '白', U: '青', B: '黒', R: '赤', G: '緑' };

/** 名前・能力・色・P/T で検索。空白区切りの語はすべて含むものに絞る */
export function searchPresets(query: string): TokenPreset[] {
  const terms = query.split(/\s+/).map(normalizeForSearch).filter(Boolean);
  if (terms.length === 0) return [];
  return PRESETS.filter((p) => {
    const hay = normalizeForSearch(
      [
        p.name.ja,
        p.name.en,
        p.rules?.ja ?? '',
        p.rules?.en ?? '',
        KIND_LABEL[p.kind].ja,
        KIND_LABEL[p.kind].en,
        p.colors.map((c) => COLOR_WORDS[c]).join(''),
        p.colors.length === 0 ? '無色' : p.colors.length > 1 ? '多色' : '',
        p.pt ? p.pt.join('/') : '',
      ].join(' '),
    );
    return terms.every((t) => hay.includes(t));
  });
}

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
