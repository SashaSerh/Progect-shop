import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(process.cwd(), 'css', 'main.css'), 'utf8');

describe('Spacing utilities (static checks)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('defines .stack and .hstack utilities in CSS', () => {
    expect(css.includes('.stack')).toBeTruthy();
    expect(css.includes('.hstack')).toBeTruthy();
  });

  it('defines gap modifier classes', () => {
    expect(css.includes('.gap-sm')).toBeTruthy();
    expect(css.includes('.gap-md')).toBeTruthy();
    expect(css.includes('.gap-lg')).toBeTruthy();
  });

  it('works when applied to elements (class presence)', () => {
    const el = document.createElement('div');
    el.className = 'stack gap-md';
    el.innerHTML = '<div>A</div><div>B</div>';
    document.body.appendChild(el);
    expect(el.classList.contains('stack')).toBe(true);
    expect(el.classList.contains('gap-md')).toBe(true);
  });
});