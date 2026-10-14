import ts from 'typescript';
import { readFileSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const output = join(root, '.test-build');
function compile(directory, relative = '') {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const next = join(relative, entry.name);
    if (entry.isDirectory()) compile(join(directory, entry.name), next);
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      const source = readFileSync(join(directory, entry.name), 'utf8');
      let { outputText } = ts.transpileModule(source, { compilerOptions: {
        target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext,
      } });
      outputText = outputText.replace(/(from\s+['"])(\.[^'"]+)(['"])/g, (_, a, b, c) => a + b.replace(/\.ts$/, '').replace(/(?<!\.js)$/, '.js') + c);
      const target = join(output, next.replace(/\.ts$/, '.js'));
      mkdirSync(join(target, '..'), { recursive: true });
      writeFileSync(target, outputText);
    }
  }
}
compile(join(root, 'src'));
const files = readdirSync(join(root, 'tests')).filter(f => f.endsWith('.test.mjs')).map(f => join(root, 'tests', f));
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
