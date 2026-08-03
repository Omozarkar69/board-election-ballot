import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve('contracts/managed/board_voting');
const target = resolve('public/midnight/board_voting');

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await Promise.all([
  cp(resolve(source, 'keys'), resolve(target, 'keys'), { recursive: true }),
  cp(resolve(source, 'zkir'), resolve(target, 'zkir'), { recursive: true }),
]);

console.log('Board-election keys are browser-ready.');
