import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'frontend');
const frontendDist = path.join(frontendDir, 'dist');
const rootDist = path.join(rootDir, 'dist');

console.log('--- Step 1: Installing frontend dependencies ---');
execSync('npm install --include=dev', { cwd: frontendDir, stdio: 'inherit' });

console.log('--- Step 2: Building frontend with Vite ---');
execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });

if (fs.existsSync(frontendDist)) {
  console.log('--- Step 3: Mirroring build output to root dist directory ---');
  if (fs.existsSync(rootDist)) {
    fs.rmSync(rootDist, { recursive: true, force: true });
  }
  fs.cpSync(frontendDist, rootDist, { recursive: true });
  console.log('--- Build complete: Both frontend/dist and ./dist are ready ---');
} else {
  console.error('ERROR: frontend/dist was not created by Vite build.');
  process.exit(1);
}
