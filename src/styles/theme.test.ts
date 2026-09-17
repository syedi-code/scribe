import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Two rules that can only be written here, both reported from a phone. The
 * stylesheet is read off disk because a test runner hands back an empty string
 * for a CSS import.
 */
const THEME = readFileSync('src/styles/theme.css', 'utf8');

const rule = (selector: string) =>
	THEME.slice(THEME.indexOf(`${selector} {`)).split('}')[0];

describe('the base stylesheet', () => {
	// `overflow: hidden` on the viewport is what takes pull-to-refresh away
	// from a phone. Nothing scrolls the document anyway: the shell is exactly
	// the viewport and every scrolling region is inside it.
	it('leaves the document scroller alone, so a phone can pull to refresh', () => {
		expect(THEME).toContain('body {');
		expect(rule('body')).not.toContain('overflow');
	});

	it('still holds the shell to the height of the viewport', () => {
		expect(rule('#root')).toContain('height: 100%');
	});
});
