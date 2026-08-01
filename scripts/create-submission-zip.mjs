import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const shortSha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const outDir = resolve(root, 'dist');
const outFile = resolve(outDir, `autex-carbench-final-${shortSha}.zip`);

mkdirSync(outDir, { recursive: true });

execFileSync('git', [
  'archive',
  '--format=zip',
  '--prefix=Autex/',
  '-o',
  outFile,
  'HEAD',
  '--',
  '.',
  ':(exclude).agents',
  ':(exclude).github',
  ':(exclude).idx',
  ':(exclude).modified',
  ':(exclude)dist',
], { cwd: root, stdio: 'inherit' });

const { size } = statSync(outFile);
console.log(JSON.stringify({ outFile, sizeBytes: size, shortSha }, null, 2));
