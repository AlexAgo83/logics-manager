import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The README keeps one short shape shared with cdx-manager; feature detail lives in docs/.
const readme = readFileSync(join(__dirname, '..', 'README.md'), 'utf8');

describe('README structure', () => {
  it('has exactly the shared sections in order and no subsections', () => {
    expect([...readme.matchAll(/^## (.+)$/gm)].map((m) => m[1])).toEqual(['Get started in a minute', 'What you can do', 'Documentation']);
    expect(readme).not.toMatch(/^#{3,} /m);
  });

  it('stays short and ends with the licence line', () => {
    const lines = readme.trimEnd().split('\n');
    expect(lines.length).toBeLessThanOrEqual(90);
    expect(lines[lines.length - 1]).toContain('MIT licensed');
  });
});
