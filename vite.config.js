import { defineConfig } from 'vite';

const scssFullReload = {
  name: 'scss-full-reload',
  handleHotUpdate({ file, server }) {
    if (file.endsWith('.scss')) {
      server.ws.send({ type: 'full-reload' });
      return [];
    }
  },
};

export default defineConfig({
  base: '/',
  plugins: [scssFullReload],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main:        'index.html',
        'bingo-dice': 'bingo-dice.html',
        'dice-yatzy': 'dice-yatzy.html',
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
