import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stdout } from 'node:process';

const cssDir = 'css';
const outputFile = join(cssDir, 'main.css');

const sourceFiles = [
  'variables.css',
  'reset.css',
  'base.css',
  'layout.css',
  'header.css',
  'controls.css',
  'grid.css',
  'areas.css',
  'output.css',
  'responsive.css',
];

const parts = sourceFiles.map((file) => {
  const content = readFileSync(join(cssDir, file), 'utf8');
  return `/* ═══ ${file} ${'═'.repeat(Math.max(0, 50 - file.length))} */\n\n${content}`;
});

writeFileSync(outputFile, parts.join('\n'), 'utf8');
stdout.write(`Built ${outputFile} from ${sourceFiles.length} source files\n`);
