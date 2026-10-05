/**
 * 枠の質感用のノイズテクスチャ（グレースケール、繰り返し可能）。
 * 毎回同じ見た目になるようシード固定。
 */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** タイル可能なバリューノイズ（複数オクターブ） */
function tileableNoise(size: number, seed: number, octaves: { cells: number; amp: number }[]): Float32Array {
  const out = new Float32Array(size * size);
  const rand = mulberry32(seed);
  for (const { cells, amp } of octaves) {
    const grid = new Float32Array(cells * cells).map(() => rand());
    const g = (ix: number, iy: number) => grid[((iy % cells) + cells) % cells * cells + (((ix % cells) + cells) % cells)];
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * cells;
      const iy = Math.floor(fy);
      const ty = fy - iy;
      const sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cells;
        const ix = Math.floor(fx);
        const tx = fx - ix;
        const sx = tx * tx * (3 - 2 * tx);
        const a = g(ix, iy) + (g(ix + 1, iy) - g(ix, iy)) * sx;
        const b = g(ix, iy + 1) + (g(ix + 1, iy + 1) - g(ix, iy + 1)) * sx;
        out[y * size + x] += (a + (b - a) * sy) * amp;
      }
    }
  }
  return out;
}

const cache = new Map<string, HTMLCanvasElement>();

/**
 * kind:
 * - 'frame': ざらっとした石・金属のような質感
 * - 'paper': テキスト欄用の細かい紙の質感
 */
export function getTexture(kind: 'frame' | 'paper'): HTMLCanvasElement {
  const hit = cache.get(kind);
  if (hit) return hit;
  const size = 256;
  const octaves =
    kind === 'frame'
      ? [
          { cells: 4, amp: 0.35 },
          { cells: 16, amp: 0.3 },
          { cells: 64, amp: 0.2 },
          { cells: 128, amp: 0.15 },
        ]
      : [
          { cells: 8, amp: 0.3 },
          { cells: 64, amp: 0.3 },
          { cells: 128, amp: 0.4 },
        ];
  const n = tileableNoise(size, kind === 'frame' ? 1337 : 4242, octaves);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < n.length; i++) {
    const v = Math.max(0, Math.min(255, Math.round(n[i] * 255)));
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  cache.set(kind, canvas);
  return canvas;
}
