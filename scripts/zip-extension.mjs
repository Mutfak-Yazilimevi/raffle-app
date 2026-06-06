import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { platform } from 'node:os';

const publicDir = resolve(process.cwd(), 'public');
const zipPath = join(publicDir, 'instagram-raffle-helper.zip');
const extensionDir = resolve(process.cwd(), 'chrome-extension');

if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

if (!existsSync(extensionDir)) {
  console.error(`chrome-extension klasörü bulunamadı: ${extensionDir}`);
  process.exit(1);
}

if (existsSync(zipPath)) {
  rmSync(zipPath);
}

const isWindows = platform() === 'win32';

try {
  if (isWindows) {
    const source = join(extensionDir, '*');
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${source}' -DestinationPath '${zipPath}' -Force"`,
      { stdio: 'inherit' }
    );
  } else {
    execSync(`zip -r ${JSON.stringify(zipPath)} .`, {
      cwd: extensionDir,
      stdio: 'inherit',
    });
  }
  console.log(`Extension packaged: ${join('public', 'instagram-raffle-helper.zip')}`);
} catch (err) {
  console.error('Extension zip could not be created:', err.message);
  process.exit(1);
}
