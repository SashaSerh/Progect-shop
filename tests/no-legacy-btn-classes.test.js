import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

// Only scan code directories / files where legacy classes are not allowed
const SCAN_ROOTS = ['components', 'js', 'css', 'index.html', '404.html'];

async function collectRoots(roots) {
  const result = [];
  for (const r of roots) {
    const full = path.join(process.cwd(), r);
    try {
      const st = await fs.stat(full);
      if (st.isDirectory()) {
        result.push(...await collectDir(full));
      } else if (st.isFile()) {
        result.push(full);
      }
    } catch (e) {
      // ignore missing
    }
  }
  return result;
}

async function collectDir(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let files = [];
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files = files.concat(await collectDir(full));
    else files.push(full);
  }
  return files;
}

function isRealClassTokenAt(line, idx) {
  // idx is index of 'btn--' in the line
  const before = idx - 1 >= 0 ? line[idx - 1] : '\0';
  // allowed preceding chars are whitespace or quote or start
  if (!(before === '"' || before === "'" || before === ' ' || before === '\t' || before === '\0')) return false;
  // ensure the token indeed continues as a class token
  const after = line.slice(idx + 5); // after 'btn--'
  return /^[A-Za-z0-9_-]+/.test(after);
}

describe('No legacy button classes', () => {
  it('should not contain `btn--` in source files (components/js/css)', async () => {
    const files = await collectRoots(SCAN_ROOTS);
    const violations = [];

    for (const f of files) {
      const content = await fs.readFile(f, 'utf8');
      const lines = content.split('\n');
      const fileMatches = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let idx = line.indexOf('btn--');
        while (idx !== -1) {
          if (isRealClassTokenAt(line, idx)) {
            fileMatches.push({ line: i + 1, snippet: line.trim() });
            break; // record only one match per line
          }
          idx = line.indexOf('btn--', idx + 1);
        }
        if (fileMatches.length >= 5) break;
      }

      if (fileMatches.length) violations.push({ file: path.relative(process.cwd(), f), matches: fileMatches });
    }

    if (violations.length) {
      const msg = violations
        .map(v => `${v.file}\n${v.matches.map(m => `  ${m.line}: ${m.snippet}`).join('\n')}`)
        .join('\n\n');
      throw new Error(`Found legacy "btn--" usages in source (components/js/css):\n${msg}`);
    }

    expect(violations.length).toBe(0);
  });
});
