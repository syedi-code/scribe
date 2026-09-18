import { describe, expect, it } from 'vitest';
import { markersFor, segmentAnswer } from './parse';
import { nodesIn } from './walk';

/**
 * Both from conversation 4ba7cb2c on production, where the reader was shown
 * the same passage of `The Order of Things` twice running.
 */
describe('a citation that repeats a passage the prose already wrote', () => {
	const proseOf = (text: string) =>
		nodesIn(segmentAnswer(text, markersFor(text, undefined)));

	// The prose quoted a fragment and the citation quoted a longer passage, so
	// neither held the other -- they only overlapped.
	it('is folded in when the two overlap without either containing the other', () => {
		const text =
			'Foucault writes that it is "doubtless nothing more than a sociological phenomenon. It did not provoke the slightest alteration in the history of thought, or modify the development of knowledge one jot." [P28 "Voltaire reading Newton, all this is doubtless nothing more than a sociological phenomenon. It did not provoke the slightest alteration in the history of thought"]';
		const nodes = proseOf(text);
		const citation = nodes.find((node) => node.kind === 'citation');

		expect(citation).toBeTruthy();
		// The quotation shown is the one the prose wrote, not a second copy.
		expect(citation?.kind === 'citation' && citation.quote).toContain(
			'or modify the development of knowledge one jot'
		);
		expect(
			nodes.filter(
				(node) =>
					node.kind === 'text' &&
					node.text.includes('sociological phenomenon')
			)
		).toHaveLength(0);
	});

	// A clause sat between the closing quote and the citation, so the
	// quotation was not flush against it.
	it('is folded in when a clause trails the quotation', () => {
		const text =
			'It rests on the "reciprocal kinship between knowledge and language" that characterized Classical thought [P28 "its condition of possibility is nevertheless there, in that reciprocal kinship between knowledge and language"].';
		const nodes = proseOf(text);
		const citation = nodes.find((node) => node.kind === 'citation');

		expect(citation?.kind === 'citation' && citation.quote).toBe(
			'reciprocal kinship between knowledge and language'
		);
		// The clause is kept, once, after the folded quotation.
		const text_ = nodes
			.filter((node) => node.kind === 'text')
			.map((node) => (node.kind === 'text' ? node.text : ''))
			.join('');
		expect(text_).toContain('that characterized Classical thought');
		expect(text_).not.toContain('condition of possibility');
	});

	// Five words is the shortest run that is a quotation rather than a
	// coincidence of common words.
	it('is left alone when the two merely share a few common words', () => {
		const text =
			'He calls it "a wholly different account of the matter" [P9 "the nature of the order of things"].';
		const nodes = proseOf(text);
		const citation = nodes.find((node) => node.kind === 'citation');

		expect(citation?.kind === 'citation' && citation.quote).toBe(
			'the nature of the order of things'
		);
	});
});
