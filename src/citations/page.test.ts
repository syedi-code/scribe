import { describe, expect, it } from 'vitest';
import { reflow } from './page';

/**
 * The page behind a citation, on a phone, where the drawer is the whole screen.
 *
 * A PDF's text layer breaks a line wherever the typesetter did. Printing those
 * breaks gave a column of ragged half-lines — the bug this exists for.
 */
describe('a page reflowed for reading', () => {
	it('rejoins the lines a typesetter broke', () => {
		expect(reflow('Supposing that Truth is a woman —\nwhat then?')).toEqual(
			['Supposing that Truth is a woman — what then?']
		);
	});

	it('keeps a blank line as a paragraph', () => {
		expect(
			reflow('One line\nand its rest.\n\nA second\nparagraph.')
		).toEqual(['One line and its rest.', 'A second paragraph.']);
	});

	// The hyphen stays: it is the only thing between the halves on the page,
	// and a quote that matched across it has to still read as it did there.
	it('closes a hyphenated break without putting a space in it', () => {
		expect(
			reflow('the ascetic ideal is a philo-\nsophy of denial')
		).toEqual(['the ascetic ideal is a philo-sophy of denial']);
	});

	it('changes no words', () => {
		const page = 'He who fights\nwith monsters\n\nshould be careful.';
		const words = (text: string) => text.split(/\s+/).filter(Boolean);
		expect(words(reflow(page).join(' '))).toEqual(
			words(page.replace(/-\n/g, '-'))
		);
	});

	it('drops the blank run at the end of a page', () => {
		expect(reflow('A line.\n\n\n   \n')).toEqual(['A line.']);
		expect(reflow('')).toEqual([]);
	});
});
