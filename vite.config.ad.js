import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const game = process.env.GAME;
if (!game) throw new Error('GAME env var is required (e.g. GAME=bingo-dice)');

export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: {
    outDir: 'dist-ad',
    emptyOutDir: false,
    assetsInlineLimit: Infinity,
    cssCodeSplit: false,
    minify: 'esbuild',
    rollupOptions: {
      input: `${game}.html`,
    },
  },
});
