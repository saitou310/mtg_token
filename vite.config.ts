import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages では https://<user>.github.io/mtg_token/ で配信される
export default defineConfig({
  base: '/mtg_token/',
  plugins: [react()],
  build: {
    // PDF 出力（pdf-lib）は遅延読み込みの別チャンクで、単体で 500kB を少し超える
    chunkSizeWarningLimit: 600,
  },
});
