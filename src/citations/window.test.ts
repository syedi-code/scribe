import { describe, expect, it } from 'vitest';
import { findQuote } from './window';

/**
 * The server does not send the matched window, so every citation fell through
 * to the branch that printed the whole page.
 */
const PAGE = [
	'Of the three kinds of good, external goods, goods of the body, and goods of the soul, the last are the ones truly worth having.',
	'For the happy man must have both a body in a certain state and the external goods in a certain measure, so that he may not be impeded in his activity.',
	'Those who say that the victim on the rack is happy if he is good are talking nonsense, whether they mean to or not.',
].join('\n\n');

describe('a quote found on the page it names', () => {
	it('is returned with the page either side of it', () => {
		const found = findQuote(PAGE, 'the victim on the rack is happy');

		expect(found).toBeTruthy();
		expect(found?.text).toContain('victim on the rack');
		expect(found?.before).toContain('external goods');
	});

	// The whole point: far less than the page.
	it('is a window, not the page', () => {
		const found = findQuote(PAGE, 'the victim on the rack is happy');
		const shown =
			(found?.before.length ?? 0) +
			(found?.text.length ?? 0) +
			(found?.after.length ?? 0);

		expect(shown).toBeLessThan(PAGE.length);
	});

	// These pages are scanned; a faithful quote still misses by a letter.
	it('survives a scanning error in the middle of the passage', () => {
		const found = findQuote(PAGE, 'the happy man must have both a bodv in a certain state');

		expect(found).toBeTruthy();
		expect(found?.text).toContain('happy man must have both a');
	});

	it('opens and closes on a word, never mid-word', () => {
		const long = 'x '.repeat(400) + PAGE;
		const found = findQuote(long, 'the victim on the rack is happy');

		expect(found?.before.startsWith(' ')).toBe(false);
		expect(found?.after.endsWith(' ')).toBe(false);
	});

	it('is nothing at all when the words are not there', () => {
		expect(findQuote(PAGE, 'a wholly different sentence about turnips')).toBeNull();
	});

	// Five words, the same floor a citation has to clear to be evidence.
	it('is nothing when only a few common words line up', () => {
		expect(findQuote(PAGE, 'of the body and')).toBeNull();
	});
});
