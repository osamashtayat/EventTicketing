import { readFileSync } from 'node:fs';
const css = readFileSync('src/styles/tokens.css', 'utf8');
import { expect, it } from 'vitest';
it('semantic text, action and control colors meet their intended contrast', () => {
  function token(name: string) {
    const line = css.split('\n').find((line) => line.trim().startsWith(name + ':'));
    const hex = line?.match(/#[a-f0-9]+/i)?.[0];
    if (!hex) throw new Error(`Missing token ${name}`);
    return hex.length === 4
      ? '#' +
          hex
            .slice(1)
            .split('')
            .map((c) => c + c)
            .join('')
      : hex;
  }
  function luminance(hex: string) {
    const rgb = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return (rgb[0] ?? 0) * 0.2126 + (rgb[1] ?? 0) * 0.7152 + (rgb[2] ?? 0) * 0.0722;
  }
  function contrast(a: string, b: string) {
    const x = luminance(token(a)),
      y = luminance(token(b));
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  for (const [foreground, background] of [
    ['--text-primary', '--surface-card'],
    ['--text-muted', '--surface-canvas'],
    ['--text-inverse', '--surface-dark'],
    ['--text-primary', '--accent'],
    ['--text-primary', '--accent-hover'],
    ['--accent-ink', '--surface-card'],
  ]) {
    if (!foreground || !background) throw new Error('Invalid color pair');
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  }
  expect(contrast('--border-control', '--surface-card')).toBeGreaterThanOrEqual(3);
});
