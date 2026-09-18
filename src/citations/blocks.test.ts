import { describe, expect, it } from 'vitest';
import { blocksOf, localise } from './blocks';
import { markersFor, segmentAnswer } from './parse';
import { nodesIn, printedIn } from './walk';

const kinds = (text: string) => blocksOf(text).map((block) => block.kind);

describe('the shapes a model writes in', () => {
	it('reads a heading as a heading', () => {
		expect(kinds('## A Sample of Five Works\n\nThe first.')).toEqual([
			'heading',
			'prose',
		]);
	});

	// `**1. Al-Ghazali's ...**` on a line of its own is a heading, not prose
	// that happens to be bold.
	it('reads a line that is nothing but bold as a heading', () => {
		expect(kinds('**1. Deliverance from Error**\n\nA spiritual work.')).toEqual(
			['heading', 'prose']
		);
	});

	it('reads a list, and keeps its items apart', () => {
		const blocks = blocksOf('- first thing\n- second thing\n- third');
		expect(blocks).toHaveLength(3);
		expect(blocks.every((block) => block.kind === 'item')).toBe(true);
	});

	it('reads a numbered list', () => {
		expect(kinds('1. first\n2. second')).toEqual(['item', 'item']);
	});

	it('reads a quotation block', () => {
		expect(kinds('> the will to truth\n> is a faith')).toEqual(['quote']);
	});

	it('reads a fenced code block, and does not read inside it', () => {
		const blocks = blocksOf('```ts\n## not a heading\n```');
		expect(blocks).toHaveLength(1);
		expect(blocks[0].kind).toBe('code');
	});

	// Mid-stream the closing ticks have not arrived yet.
	it('reads an unterminated fence as code to the end', () => {
		expect(kinds('```\nstill being written')).toEqual(['code']);
	});

	it('reads a rule', () => {
		expect(kinds('one\n\n---\n\ntwo')).toEqual(['prose', 'rule', 'prose']);
	});

	it('keeps an ordinary paragraph whole across a single newline', () => {
		expect(kinds('First line.\nStill the first.')).toEqual(['prose']);
	});

	// A stray mark mid-stream must not spin the line scanner.
	it('terminates on a line that opens and closes nothing', () => {
		expect(() => blocksOf('**\n\ntext')).not.toThrow();
		expect(kinds('**')).toEqual(['prose']);
	});
});

/**
 * The reason blocks carry spans rather than cleaned text: a citation is found
 * by character offset, and a block that handed back a stripped string would
 * put every offset out by the width of the marks it removed.
 */
describe('a citation inside a block', () => {
	it('survives being inside a list item', () => {
		const text =
			'- Nietzsche says so [P7 "the will to truth is a faith"]\n- and again';
		const blocks = segmentAnswer(text, markersFor(text, undefined));
		const citation = nodesIn(blocks).find(
			(node) => node.kind === 'citation'
		);

		expect(blocks[0].kind).toBe('list');
		expect(citation?.kind === 'citation' && citation.quote).toBe(
			'the will to truth is a faith'
		);
	});

	it('survives being inside a quotation block', () => {
		const text = '> He says [P7 "the will to truth is a faith"] plainly.';
		const blocks = segmentAnswer(text, markersFor(text, undefined));

		expect(blocks[0].kind).toBe('quote');
		expect(
			nodesIn(blocks).some((node) => node.kind === 'citation')
		).toBe(true);
	});

	// Every citation keeps the index it has in the answer, whatever block it
	// lands in, or the stamp a reader clicks is not the one the server checked.
	it('keeps its number when the blocks around it change', () => {
		const text =
			'## Head\n\n- one [P1 "a quote of five words here"]\n- two [P2 "another quote of five words"]\n\nAfter [P3 "a third quote of words"].';
		const found = nodesIn(segmentAnswer(text, markersFor(text, undefined)))
			.filter((node) => node.kind === 'citation')
			.map((node) => (node.kind === 'citation' ? node.index : -1));

		expect(found).toEqual([0, 1, 2]);
	});

	it('is dropped from a code block rather than rendered as one', () => {
		const text = '```\n[P1 "not a citation in here"]\n```';
		expect(
			nodesIn(segmentAnswer(text, markersFor(text, undefined)))
		).toHaveLength(0);
	});
});

describe('rebasing a citation onto its block', () => {
	it('moves an offset past the marks the block was made of', () => {
		const source = '> a quotation here';
		const moved = localise(source, [{ from: 2, to: source.length }], [
			{ start: 4, end: 13 },
		]);

		expect(moved.text).toBe('a quotation here');
		expect(moved.text.slice(moved.markers[0].start, moved.markers[0].end)).toBe(
			source.slice(4, 13)
		);
	});

	it('drops a marker that fell outside the block', () => {
		const moved = localise('abcdef', [{ from: 0, to: 3 }], [
			{ start: 4, end: 5 },
		]);
		expect(moved.markers).toHaveLength(0);
	});
});

describe('what a reader is shown', () => {
	it('has no Markdown left anywhere in it', () => {
		const text = [
			'## A Sample',
			'',
			'**1. The first**',
			'',
			'- a point',
			'- another',
			'',
			'> an extract',
			'',
			'---',
			'',
			'Ordinary `code` and *emphasis*.',
		].join('\n');
		const printed = printedIn(
			segmentAnswer(text, markersFor(text, undefined))
		);

		expect(printed).not.toContain('#');
		expect(printed).not.toContain('**');
		expect(printed).not.toContain('- ');
		expect(printed).not.toContain('`');
		expect(printed).not.toContain('>');
	});
});
