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

	// Everything below is from production on 2026-09-18, after the
	// instruction rewrite that was meant to stop it.

	const citationsIn = (text: string) =>
		proseOf(text).filter((node) => node.kind === 'citation');
	const printed = (text: string) =>
		proseOf(text)
			.map((node) =>
				node.kind === 'citation'
					? `“${node.quote}”■`
					: 'text' in node
						? node.text
						: ''
			)
			.join('');

	// Three words cannot clear a five-word floor, and this is how the model
	// most often does it.
	it('is folded in when the prose quotes a few words of the cited passage', () => {
		const text =
			'He concludes with the bluntest formulation: “Plato is boring” [P10 “Plato is boring.-Ultimately my distrust of Plato runs deep”].';
		expect(printed(text)).toBe(
			'He concludes with the bluntest formulation: “Plato is boring”■.'
		);
	});

	it('is folded in across a clause of any length', () => {
		const text =
			'Nietzsche says he is “a thoroughgoing sceptic” about <author>Plato</author> and rejects the scholarly admiration for him as an artist [P10 “In relation to Plato I am a thoroughgoing sceptic”]. He then asks.';
		expect(printed(text)).toBe(
			'Nietzsche says he is “a thoroughgoing sceptic”■ about Plato and rejects the scholarly admiration for him as an artist. He then asks.'
		);
	});

	// The nearest quotation is not always the one being repeated.
	it('finds the quotation it repeats, not merely the nearest one', () => {
		const text =
			'Hegel therefore writes that “Spirit is at war with itself,” and calls its development “a severe, a mighty conflict with itself” [P9 “Thus Spirit is at war with itself; it has to overcome itself”].';
		const [citation] = citationsIn(text);
		expect(citation.kind === 'citation' && citation.quote).toBe(
			'Spirit is at war with itself,'
		);
		expect(printed(text)).toContain(
			'“a severe, a mighty conflict with itself”.'
		);
	});

	it('stamps the words the server checked, and leaves the rest of the prose as prose', () => {
		const text =
			'He says that he “mixes up all stylistic forms,” making him “a first stylistic decadent” [P10 “mixes up all stylistic forms, which makes him a first stylistic decadent”].';
		expect(citationsIn(text)).toHaveLength(1);
		expect(printed(text)).toBe(
			'He says that he “mixes up all stylistic forms,” making him “a first stylistic decadent”■.'
		);
	});

	// Piled at the end, only the first citation had any prose in front of
	// it. A pile shares the prose before it.
	it('folds every citation in a pile into the quotation it repeats', () => {
		const text =
			'Heraclitus sees reality as an “identity of life and death” in which “opposites are endlessly flowing,” while Shelley answers: “if I cannot inspire love, I will cause fear”. [P20 “identity of day and night, winter and summer”] [P21 “opposites are endlessly flowing or passing into each other”] [P17 “if I cannot inspire love, I will cause fear”] So it goes.';
		expect(printed(text)).toBe(
			'Heraclitus sees reality as an “identity of life and death” in which “opposites are endlessly flowing,”■ while Shelley answers: “if I cannot inspire love, I will cause fear”■. “identity of day and night, winter and summer”■ So it goes.'
		);
		// Each keeps the index it has in the answer.
		expect(
			citationsIn(text).map((node) =>
				node.kind === 'citation' ? node.index : -1
			)
		).toEqual([1, 2, 0]);
	});

	// The same claim in different words is not a repeat, and a stamp on the
	// prose's words would say they were found on the page when they were
	// never checked.
	it('never folds a citation onto words it does not contain', () => {
		const text =
			'Thought “preserves, dignifies its material” [P3 “the source and birthplace of a new, and in fact higher form”].';
		expect(printed(text)).toBe(
			'Thought “preserves, dignifies its material” “the source and birthplace of a new, and in fact higher form”■.'
		);
	});

	it('leaves a scare quote alone', () => {
		const text =
			'The “war” here is a metaphor [P9 “Spirit is at war with itself”].';
		expect(printed(text)).toBe(
			'The “war” here is a metaphor “Spirit is at war with itself”■.'
		);
	});
});
