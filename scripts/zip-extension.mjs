import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { platform } from 'node:os';

const publicDir = 'public';
const zipPath = join(publicDir, 'instagram-raffle-helper.zip');

if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

if (existsSync(zipPath)) {
  rmSync(zipPath);
}

const isWindows = platform() === 'win32';

try {
  if (isWindows) {
    const source = join(process.cwd(), 'chrome-extension', '*');
    const dest = join(process.cwd(), zipPath);
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${source}' -DestinationPath '${dest}' -Force"`,
      { stdio: 'inherit' }
    );
  } else {
    execSync(`zip -r "${zipPath}" .`, { cwd: 'chrome-extension', stdio: 'inherit' });
  }
  console.log(`Extension packaged: ${zipPath}`);
} catch (err) {
  console.warn('Extension zip could not be created:', err.message);
}
