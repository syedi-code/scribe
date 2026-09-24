import { describe, expect, it } from 'vitest';
import { stripTags, untag } from './tags';
import { markersFor, segmentAnswer } from './parse';
import { nodesIn, printedIn } from './walk';

describe('the names a model marked', () => {
	it('sets a marked work as a work', () => {
		const nodes = untag('He opens <title>The Order of Things</title> so.');
		expect(nodes).toContainEqual({
			kind: 'title',
			text: 'The Order of Things',
		});
	});

	it('inks a marked person', () => {
		const [, author] = untag('He reads <author>Voltaire</author> closely.');
		expect(author.kind).toBe('author');
		expect(author.kind === 'author' && author.text).toBe('Voltaire');
	});

	// The whole reason for asking: no rule of ours knows that Newton is a
	// person and Sufism is not.
	it('inks a person the library has never heard of', () => {
		const inked = untag(
			'<author>Newton</author> and <author>Fontenelle</author>'
		)
			.filter((node) => node.kind === 'author')
			.map((node) => (node.kind === 'author' ? node.text : ''));
		expect(inked).toEqual(['Newton', 'Fontenelle']);
	});

	it('gives one person one ink wherever they are named', () => {
		const inks = untag(
			'<author>Foucault</author> against <author>Foucault</author>'
		)
			.filter((node) => node.kind === 'author')
			.map((node) => (node.kind === 'author' ? node.ink : -1));
		expect(inks[0]).toBe(inks[1]);
	});

	it('keeps the words around the marks, spacing and all', () => {
		const text = 'Before <author>Kant</author> and after.';
		expect(
			untag(text)
				.map((node) => ('text' in node ? node.text : ''))
				.join('')
		).toBe('Before Kant and after.');
	});
});

/**
 * `CLAUDE.md` forbade this for years on the grounds that a model forgets and a
 * forgotten tag shows the reader markup. The first half is true. The second is
 * only true if we print it.
 */
describe('a mark the model got wrong', () => {
	// Production, 2026-09-18: the reader was shown `Plato>’s`.
	it('takes a bare > as the close it was meant to be', () => {
		expect(printedOf('There <author>Plato>’s intoxication')).toBe(
			'There Plato’s intoxication'
		);
	});

	it('shows the words, never the brackets, when it forgets to close one', () => {
		expect(printedOf('He reads <author>Voltaire closely.')).toBe(
			'He reads Voltaire closely.'
		);
	});

	it('shows the words when it closes one it never opened', () => {
		expect(printedOf('He reads Voltaire</author> closely.')).toBe(
			'He reads Voltaire closely.'
		);
	});

	it('leaves an empty mark out altogether', () => {
		expect(
			untag('a <author></author> b').every((node) => node.kind === 'text')
		).toBe(true);
	});

	it('strips a mark from anywhere at all', () => {
		expect(stripTags('<title>a</title> <author>b</author>')).toBe('a b');
	});
});

const printedOf = (text: string) =>
	printedIn(segmentAnswer(text, markersFor(text, undefined)));

/**
 * A quote is matched against its page character for character, so a mark
 * inside one would turn a faithful citation into an unverified one.
 */
describe('a mark inside a quotation', () => {
	it('is taken back out before the quote is shown', () => {
		const text =
			'He writes [P7 "the will to <author>truth</author> is a faith"].';
		const citation = nodesIn(
			segmentAnswer(text, markersFor(text, undefined))
		).find((node) => node.kind === 'citation');

		expect(citation?.kind === 'citation' && citation.quote).toBe(
			'the will to truth is a faith'
		);
	});
});

describe('what the model marked and what the library knows', () => {
	// The model's mark wins; the catalogue is only ever the fallback.
	it('does not mark the same name twice', () => {
		const text = '<author>Nietzsche</author> and Nietzsche again.';
		const authors = nodesIn(
			segmentAnswer(text, markersFor(text, undefined), [], ['Nietzsche'])
		).filter((node) => node.kind === 'author');

		expect(authors).toHaveLength(2);
		expect(printedOf(text)).toBe('Nietzsche and Nietzsche again.');
	});

	it('catches a name the model forgot, from the catalogue', () => {
		const text = 'Nietzsche says so.';
		const authors = nodesIn(
			segmentAnswer(text, markersFor(text, undefined), [], ['Nietzsche'])
		).filter((node) => node.kind === 'author');

		expect(authors).toHaveLength(1);
	});
});

describe('one person, one ink', () => {
	// The model tags a name as it pleases, sometimes twice in one answer, and
	// the whole of what it tagged was hashed: `Immanuel Kant` and `Kant` came
	// out in two inks (#48).
	const inksOf = (text: string) =>
		untag(text).flatMap((node) =>
			node.kind === 'author' ? [[node.text, node.ink] as const] : []
		);
	const sameInk = (...tagged: string[]) => {
		const inks = tagged.flatMap((text) =>
			inksOf(text).map(([, ink]) => ink)
		);
		expect(new Set(inks).size).toBe(1);
		expect(inks[0]).toBeGreaterThanOrEqual(0);
	};

	it('however much of the name was tagged', () => {
		sameInk(
			'<author>Immanuel Kant</author>',
			'Immanuel <author>Kant</author>',
			'<author>Kant</author>'
		);
	});

	it('through a particle, a suffix and an apostrophe', () => {
		sameInk(
			'<author>Simone de Beauvoir</author>',
			'<author>de Beauvoir</author>'
		);
		sameInk(
			'<author>Martin Luther King Jr.</author>',
			'<author>King</author>'
		);
		sameInk("<author>Ibn 'Arabī</author>", '<author>Ibn ’Arabī</author>');
	});

	it('inks the surname and leaves the given name in prose ink', () => {
		expect(
			inksOf('<author>Immanuel Kant</author>').map(([name]) => name)
		).toEqual(['Kant']);
		expect(printedOf('<author>Immanuel Kant</author> says so.')).toBe(
			'Immanuel Kant says so.'
		);
	});

	it('matches the ink the catalogue gives the same surname', () => {
		const text = '<author>Immanuel Kant</author> and Kant again.';
		const inks = nodesIn(
			segmentAnswer(text, markersFor(text, undefined), [], ['Kant'])
		).flatMap((node) => (node.kind === 'author' ? [node.ink] : []));
		expect(inks).toHaveLength(2);
		expect(new Set(inks).size).toBe(1);
	});

	it('inks every name in a tag that names two people', () => {
		expect(
			inksOf('<author>Max Horkheimer & Theodor W. Adorno</author>').map(
				([name]) => name
			)
		).toEqual(['Horkheimer', 'Adorno']);
	});
});
