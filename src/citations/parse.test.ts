import { describe, expect, it } from 'vitest';
import { nodesIn, printedIn, sentencesIn } from './walk';
import {
	alignCitations,
	markersFor,
	parseCitations,
	segmentAnswer,
	trimHalfWrittenCitation,
} from './parse';
import { inkFor } from './authors';
import type { AnswerCitation } from '../api/types';

/**
 * The awkward cases. This regex has to agree with alexandria's forever: when
 * the two drift, an answer renders with a citation the reader can see in the
 * margin and cannot find in the prose.
 */
describe('parseCitations', () => {
	it('reads the bracketed form', () => {
		expect(
			parseCitations('He says [P7 "the will to truth"] here.')
		).toEqual([
			{ handle: 'P7', quote: 'the will to truth', start: 8, end: 32 },
		]);
	});

	it('reads the form smaller models write', () => {
		const [citation] = parseCitations('“the will to truth” [P7] is it.');
		expect(citation).toMatchObject({
			handle: 'P7',
			quote: 'the will to truth',
		});
	});

	it('accepts curly quotes and a colon after the handle', () => {
		const [citation] = parseCitations(
			'[P12: “the spirit that would bear”]'
		);
		expect(citation).toMatchObject({
			handle: 'P12',
			quote: 'the spirit that would bear',
		});
	});

	it('lets a bracketed quote contain a quotation', () => {
		const [citation] = parseCitations(
			'[P3 "what in us really wants "truth"?"]'
		);
		expect(citation.quote).toBe('what in us really wants "truth"?');
	});

	it('finds every citation in order, with its offsets', () => {
		const text =
			'One [P1 "first quote here"] two [P2 "second quote here"].';
		const found = parseCitations(text);
		expect(found.map((c) => c.handle)).toEqual(['P1', 'P2']);
		expect(text.slice(found[1].start, found[1].end)).toBe(
			'[P2 "second quote here"]'
		);
	});

	it('finds nothing in prose that only looks like a citation', () => {
		expect(parseCitations('See page [7] and "this quote" nearby')).toEqual(
			[]
		);
	});
});

const citation = (
	handle: string,
	quote: string,
	extra: Partial<AnswerCitation> = {}
): AnswerCitation =>
	({
		handle,
		quote,
		ref: { document_id: 'd1', page_no: 21 },
		status: 'verified',
		...extra,
	}) as AnswerCitation;

describe('alignCitations', () => {
	it('pairs a marker with the citation for the same quote', () => {
		const markers = parseCitations('[P1 "alpha beta gamma delta"]');
		const aligned = alignCitations(markers, [
			citation('P2', 'something else entirely here'),
			citation('P1', 'alpha beta gamma delta'),
		]);
		expect(aligned[0]?.handle).toBe('P1');
	});

	it('ignores curly-vs-straight quoting when pairing', () => {
		const markers = parseCitations('[P1 "it isn’t there"]');
		const aligned = alignCitations(markers, [
			citation('P1', "it isn't there"),
		]);
		expect(aligned[0]).not.toBeNull();
	});

	it('leaves a marker unchecked rather than guessing', () => {
		const markers = parseCitations('[P9 "a quote never checked here"]');
		expect(alignCitations(markers, [])).toEqual([null]);
	});

	it('does not reuse one citation for two markers', () => {
		const markers = parseCitations(
			'[P1 "same words here"] [P1 "same words here"]'
		);
		const aligned = alignCitations(markers, [
			citation('P1', 'same words here'),
		]);
		expect(aligned[0]).not.toBeNull();
		expect(aligned[1]).toBeNull();
	});
});

describe('markersFor', () => {
	it('prefers the server’s offsets when every citation carries them', () => {
		const text = 'Prose about [P1 "a quote"] and more.';
		const markers = markersFor(text, [
			citation('P1', 'a quote', { marker: { start: 12, end: 26 } }),
		]);
		expect(markers[0]).toMatchObject({ start: 12, end: 26 });
	});

	it('falls back to parsing when they are absent', () => {
		const text = 'Prose about [P1 "a quote"] and more.';
		expect(markersFor(text, [citation('P1', 'a quote')])[0].start).toBe(12);
	});
});

describe('segmentAnswer', () => {
	const segment = (text: string) => segmentAnswer(text, parseCitations(text));

	it('splits paragraphs on blank lines only', () => {
		const blocks = segment('First line.\nStill first.\n\nSecond.');
		expect(blocks).toHaveLength(2);
	});

	it('marks the sentence a citation stands behind', () => {
		const sentences = sentencesIn(
			segment(
				'Nietzsche opens with it: [P7 "the will to truth"] That is my reading.'
			)
		);
		expect(sentences[0].cited).toBe(true);
		expect(sentences[1].cited).toBe(false);
	});

	it('starts a new sentence after a citation, not a new paragraph', () => {
		const blocks = segment(
			'He says [P7 "a quote of some length"] That is my reading.'
		);
		expect(blocks).toHaveLength(1);
		expect(sentencesIn(blocks)).toHaveLength(2);
	});

	it('still breaks the paragraph when a blank line follows a citation', () => {
		const blocks = segment(
			'He says [P7 "a quote of some length"]\n\nThat is my reading.'
		);
		expect(blocks).toHaveLength(2);
	});

	it('does not end a sentence at an abbreviated page number', () => {
		const blocks = segment('He writes on p. 9 that it is so.');
		expect(sentencesIn(blocks)).toHaveLength(1);
	});

	it('keeps emphasis and drops its markers', () => {
		const blocks = segment('It is *his* word, not mine.');
		expect(nodesIn(blocks).some((n) => n.kind === 'emphasis')).toBe(true);
		expect(printedIn(blocks)).not.toContain('*');
	});

	it('renders the quote, never the marker', () => {
		const text = nodesIn(segment('So [P7 "the will to truth"] stands.'))
			.map((node) => ('text' in node ? node.text : node.quote))
			.join('');
		expect(text).not.toContain('P7');
		expect(text).toContain('the will to truth');
	});
});

/**
 * The model quoted in its prose and cited the same words again, and the reader
 * was shown one copy while the server checked the other. Production's Marx
 * answer (d2763b7f) printed "A Critique of Political Economy" and then the
 * citation that repeats it, because an OCR error in the page — Politi?al —
 * kept the two from pairing. Now the quoted words are the citation.
 */
describe('a quotation written as <cite>', () => {
	const text =
		'The bourgeois has, without knowing it, <cite P1>a Hitler inside him</cite>, and more.';
	const blocks = () => segmentAnswer(text, parseCitations(text));
	/** Printed as a reader sees it: `printedIn` leaves a citation's words out. */
	const shown = () =>
		nodesIn(blocks())
			.map((node) => ('text' in node ? node.text : node.quote))
			.join('');

	it('reads the handle and the quoted words', () => {
		expect(parseCitations(text)).toEqual([
			{ handle: 'P1', quote: 'a Hitler inside him', start: 39, end: 74 },
		]);
	});

	it('is drawn where it was woven, in the middle of the sentence', () => {
		expect(nodesIn(blocks()).map((node) => node.kind)).toEqual([
			'text',
			'citation',
			'text',
		]);
		expect(shown()).toBe(
			'The bourgeois has, without knowing it, a Hitler inside him, and more.'
		);
	});

	it('shows the words once', () => {
		expect(shown().split('a Hitler inside him')).toHaveLength(2);
	});

	it('reads several in one sentence, in order', () => {
		const two =
			'He sees <cite P2>an identity of day and night</cite> and <cite P7>a war with itself</cite>.';
		expect(parseCitations(two).map((one) => one.handle)).toEqual(['P2', 'P7']);
	});

	it('tolerates a quoted handle', () => {
		const [citation] = parseCitations(
			'<cite ref="P3">no one colonizes innocently</cite>'
		);
		expect(citation).toMatchObject({
			handle: 'P3',
			quote: 'no one colonizes innocently',
		});
	});

	it('strips a name marked inside the quote before it is checked', () => {
		const marked =
			'<cite P1>what he cannot forgive <author>Hitler</author> for</cite>';
		const [node] = nodesIn(segmentAnswer(marked, parseCitations(marked)));
		expect(node.kind === 'citation' && node.quote).toBe(
			'what he cannot forgive Hitler for'
		);
	});

	it('still reads an answer saved in the bracketed form', () => {
		const old = 'He says [P1 "he has a Hitler inside him"] there.';
		const [, node] = nodesIn(segmentAnswer(old, parseCitations(old)));
		expect(node.kind === 'citation' && node.quote).toBe(
			'he has a Hitler inside him'
		);
	});

	it('shows the words of a malformed tag as prose, never the tag', () => {
		const broken = 'He says <cite>a Hitler inside him</cite> here.';
		expect(parseCitations(broken)).toEqual([]);
		expect(printedIn(segmentAnswer(broken, []))).toBe(
			'He says a Hitler inside him here.'
		);
	});
});

describe('trimHalfWrittenCitation', () => {
	it.each([
		'The claim stands [',
		'The claim stands [P',
		'The claim stands [P7',
		'The claim stands [P7 "the will to',
		'The claim stands [P7: “the will to truth',
	])('holds back %j until it is finished', (text) => {
		expect(trimHalfWrittenCitation(text)).toBe('The claim stands');
	});

	it.each([
		'The claim stands <',
		'The claim stands <ci',
		'The claim stands <cite P',
		'The claim stands <cite P7>',
		'The claim stands <cite P7>the will to',
		'The claim stands <cite P7>the will to truth</ci',
	])('holds back %j until the cite is closed', (text) => {
		expect(trimHalfWrittenCitation(text)).toBe('The claim stands');
	});

	it('leaves a finished cite alone', () => {
		const done = 'The claim stands <cite P7>the will to truth</cite>';
		expect(trimHalfWrittenCitation(done)).toBe(done);
	});

	it('leaves a finished citation alone', () => {
		const done = 'The claim stands [P7 "the will to truth"]';
		expect(trimHalfWrittenCitation(done)).toBe(done);
	});

	it('leaves ordinary brackets alone', () => {
		expect(trimHalfWrittenCitation('an aside (of sorts)')).toBe(
			'an aside (of sorts)'
		);
	});
});

describe('the people an answer names', () => {
	const inked = (text: string, surnames: string[]) =>
		nodesIn(segmentAnswer(text, [], [], surnames)).filter(
			(node) => node.kind === 'author'
		);

	it('writes a cited surname in its own ink', () => {
		const found = inked('Nietzsche treats truth as a faith.', [
			'Nietzsche',
		]);
		expect(found).toHaveLength(1);
		expect(found[0]).toMatchObject({ kind: 'author', text: 'Nietzsche' });
		expect(found[0].kind === 'author' && found[0].ink).toBe(
			inkFor('Nietzsche')
		);
	});

	it('gives the same person the same ink every time they are named', () => {
		const found = inked('Nietzsche asks, and Nietzsche answers.', [
			'Nietzsche',
		]);
		expect(found).toHaveLength(2);
		const inks = found.map((node) =>
			node.kind === 'author' ? node.ink : -1
		);
		expect(inks[0]).toBe(inks[1]);
	});

	// Only whole words: an adjective is prose, not an attribution.
	it('leaves a word that merely starts with a surname alone', () => {
		expect(inked('Kantian ethics, after Kant.', ['Kant'])).toHaveLength(1);
	});

	it('inks nobody the answer did not cite', () => {
		expect(inked('Nietzsche and Hegel disagree.', ['Nietzsche'])).toEqual([
			expect.objectContaining({ text: 'Nietzsche' }),
		]);
	});

	// A surname inside a work's title belongs to the title.
	it('leaves a surname inside a cited title to the title', () => {
		const nodes = nodesIn(
			segmentAnswer(
				'He read Nietzsche and Philosophy closely.',
				[],
				['Nietzsche and Philosophy'],
				['Nietzsche']
			)
		);
		expect(nodes.filter((node) => node.kind === 'author')).toHaveLength(0);
		expect(nodes.filter((node) => node.kind === 'title')).toHaveLength(1);
	});
});

/**
 * Production's Marx answer (d2763b7f) wrote `<author>W. Lough>` — a tag closed
 * with a bare `>`, which `untag` reads. The sentence splitter cut it in half
 * at the initial first, because an initial only counted as an abbreviation
 * after a space, and the reader was shown `W. Lough>`.
 */
describe('a name that begins with an initial', () => {
	const text =
		'Theses on Feuerbach, translated by <author>W. Lough>. The text includes the thesis.';

	it('is not cut in half by the full stop after the initial', () => {
		const printed = printedIn(segmentAnswer(text, []));
		expect(printed).toContain('W. Lough');
		expect(printed).not.toContain('>');
	});
});
