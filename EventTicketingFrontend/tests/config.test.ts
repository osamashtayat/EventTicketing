import { describe, expect, it } from 'vitest';
import { parseConfig } from '../src/app/config';
describe('public configuration', () => {
  it('accepts an origin and normalizes its slash', () =>
    expect(parseConfig('https://localhost:7209/')).toBe('https://localhost:7209'));
  it('rejects missing config, credentials, paths and insecure production', () => {
    for (const value of [undefined, 'bad', 'https://user:pass@host', 'https://host/api'])
      expect(() => parseConfig(value)).toThrow();
    expect(() => parseConfig('http://host', true)).toThrow();
  });
});
