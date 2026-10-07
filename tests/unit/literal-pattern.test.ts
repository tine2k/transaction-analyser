// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { escapeLiteralPattern } from '../../shared/literal-pattern';

describe('escapeLiteralPattern', () => {
  it('leaves ordinary text unchanged', () => {
    expect(escapeLiteralPattern('REWE Markt')).toBe('REWE Markt');
    expect(escapeLiteralPattern('')).toBe('');
  });

  it('prefixes every PostgreSQL ARE metacharacter with a backslash', () => {
    for (const character of ['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '[', ']', '|']) {
      expect(escapeLiteralPattern(character)).toBe(`\\${character}`);
    }
  });

  it('escapes a backslash', () => {
    expect(escapeLiteralPattern('\\')).toBe('\\\\');
    expect(escapeLiteralPattern('a\\b')).toBe('a\\\\b');
  });

  it('escapes an already-escaped sequence again so it stays literal', () => {
    expect(escapeLiteralPattern('\\.')).toBe('\\\\\\.');
  });

  it('escapes unicode text without changing the characters', () => {
    expect(escapeLiteralPattern('Müller (Berlin)')).toBe('Müller \\(Berlin\\)');
  });

  it('produces an expression that matches the text literally', () => {
    const literal = 'a+b(c)';
    const expression = new RegExp(escapeLiteralPattern(literal), 'i');

    expect(expression.test(`xx${literal}yy`)).toBe(true);
    expect(expression.test('xxaabcyy')).toBe(false);
  });
});
