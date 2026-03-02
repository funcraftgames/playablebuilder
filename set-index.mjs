import { readFileSync, writeFileSync } from 'fs';

const game = process.argv[2];
if (!game) {
  console.error('Usage: node set-index.mjs <game-name>');
  process.exit(1);
}

const html = readFileSync('index.html', 'utf-8');
const updated = html.replace(
  /src="\/src\/games\/[^/]+\/main\.js"/,
  `src="/src/games/${game}/main.js"`
);
writeFileSync('index.html', updated);
console.log(`index.html → ${game}`);
