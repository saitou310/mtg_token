// 開発用：さまざまな設定のカードを並べて描画し、見た目を確認するページ（debug.html）
import './fonts';
import { createToken, type TokenData } from './model/token';
import { PRESETS, applyPreset } from './model/presets';
import { ensureFonts, resolveFonts } from './render/fonts';
import { renderCardToCanvas } from './render/renderCard';

function sampleArt(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 900;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 900);
  g.addColorStop(0, '#6aa9d8');
  g.addColorStop(0.6, '#f3d7a1');
  g.addColorStop(1, '#5b7d3a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1200, 900);
  ctx.fillStyle = '#3d5a24';
  ctx.beginPath();
  ctx.moveTo(0, 700);
  ctx.quadraticCurveTo(400, 520, 800, 680);
  ctx.quadraticCurveTo(1000, 760, 1200, 640);
  ctx.lineTo(1200, 900);
  ctx.lineTo(0, 900);
  ctx.fill();
  ctx.fillStyle = '#fff5c0';
  ctx.beginPath();
  ctx.arc(820, 260, 110, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.ellipse(500, 560, 90, 160, 0, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

const preset = (key: string, extra: Partial<TokenData> = {}, lang: 'ja' | 'en' = 'ja') =>
  createToken({ ...applyPreset(PRESETS.find((p) => p.key === key)!, lang), ...extra });

const cases: [string, TokenData, boolean][] = [
  ['兵士 (白・テキストなし)', preset('soldier', { artist: 'Taro Yamada' }), true],
  ['スピリット (飛行)', preset('spirit'), true],
  ['エルフ・戦士 (GW 自動=ゴールド)', preset('elfWarrior'), true],
  ['ハイブリッド WU', preset('bird', { colors: ['W', 'U'], frameStyle: 'hybrid', rules: '飛行\n{T}：カードを1枚引き、その後カードを1枚捨てる。' }), true],
  ['宝物 (アーティファクト)', preset('treasure'), false],
  ['Food (en)', preset('food', {}, 'en'), true],
  ['ゾンビ 黒', preset('zombie', { flavor: '死者は眠らない。' }), true],
  ['ドラゴン 赤 フルアート', preset('dragon', { fullArt: true }), true],
  ['3色 マルドゥ', preset('soldier', { colors: ['R', 'W', 'B'], name: '戦士', typeLine: 'トークン・クリーチャー — 戦士', rules: '速攻、威迫\nこのクリーチャーが攻撃するたび、あなたは1点のライフを得る。（このクリーチャーは2体以上のクリーチャーによってしかブロックされない。）' }), true],
  ['青 長文', preset('bird', { rules: '飛行、呪禁\n{2}{U}, {T}：対象のクリーチャー1体をオーナーの手札に戻す。\nあなたがインスタント呪文かソーサリー呪文を唱えるたび、このクリーチャーをアンタップする。\n{1}：ターン終了時まで、このクリーチャーは+1/+0の修整を受ける。', flavor: '空は彼らのものだ。' }), true],
  ['ハイブリッド 3色 (緑白青)', preset('beast', { colors: ['G', 'W', 'U'], frameStyle: 'hybrid', name: 'とても長い名前のビースト・エレメンタル', rules: 'トランプル' }), true],
  ['飛行機械', preset('thopter'), true],
];

async function main() {
  const grid = document.getElementById('grid')!;
  const art = sampleArt();
  const params = new URLSearchParams(location.search);
  const dpi = Number(params.get('dpi') ?? 150);
  const only = params.get('only');
  for (const [label, token, withArt] of only ? only.split(',').map((i) => cases[Number(i)]) : cases) {
    const fonts = resolveFonts(token.fonts);
    await ensureFonts(fonts, { title: token.name + token.typeLine + '0123456789/', rules: token.rules + token.flavor });
    const fig = document.createElement('figure');
    const canvas = document.createElement('canvas');
    renderCardToCanvas(canvas, token, { art: withArt ? art : null }, dpi, { placeholder: true });
    canvas.style.width = `${canvas.width}px`;
    const cap = document.createElement('figcaption');
    cap.textContent = label;
    fig.append(canvas, cap);
    grid.append(fig);
  }
  document.body.dataset.ready = '1';
}

main();
