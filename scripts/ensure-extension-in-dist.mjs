import { copyFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const publicZip = join('public', 'instagram-raffle-helper.zip');
const distZip = join('dist', 'instagram-raffle-helper.zip');

if (!existsSync(publicZip)) {
  console.error('Eklenti ZIP bulunamadı. Önce npm run zip-extension çalıştırın.');
  process.exit(1);
}

if (!existsSync(distZip)) {
  copyFileSync(publicZip, distZip);
  console.log('Eklenti ZIP dist/ klasörüne kopyalandı.');
}

if (!existsSync(distZip) || statSync(distZip).size === 0) {
  console.error('dist/instagram-raffle-helper.zip eksik veya boş.');
  process.exit(1);
}

console.log(`dist/instagram-raffle-helper.zip OK (${statSync(distZip).size} bytes)`);
