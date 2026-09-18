import { describe, expect, it } from 'vitest';
import { brandedLabel } from './brand';
import { inkFor } from '../citations/authors';

describe("a model's maker, in its own colour", () => {
	const inked = (label: string) =>
		brandedLabel(label)
			.filter((piece) => piece.ink !== '')
			.map((piece) => [piece.text, piece.ink]);

	it('finds the maker in each of the three names', () => {
		expect(inked('Claude Haiku 4.5')).toEqual([
			['Claude', 'text-anthropic'],
		]);
		expect(inked('GPT-5.6 Luna')).toEqual([['GPT-5', 'text-openai']]);
		expect(inked('Gemini 3.8 Flash')).toEqual([
			['Gemini 3', 'text-google'],
		]);
	});

	// The major is the name of the generation and goes with the maker; the
	// minor is a release and stays grey. A number belonging to the model
	// rather than the maker stays grey whole: the 4.5 in `Claude Haiku 4.5`.
	it('takes the major of the version, and nothing after the point', () => {
		expect(inked('GPT-5.6 Luna')).toEqual([['GPT-5', 'text-openai']]);
		expect(inked('Gemini 3.8 Flash')).toEqual([
			['Gemini 3', 'text-google'],
		]);
		expect(inked('Claude Opus 5')).toEqual([['Claude', 'text-anthropic']]);
	});

	it('leaves the point release grey, beside the inked major', () => {
		const grey = brandedLabel('GPT-5.6 Luna')
			.filter((piece) => piece.ink === '')
			.map((piece) => piece.text)
			.join('');
		expect(grey).toBe('.6 Luna');
	});

	it('keeps the rest of the name, exactly', () => {
		for (const label of [
			'Claude Haiku 4.5',
			'GPT-5.6 Luna',
			'Gemini 3.8 Flash',
		]) {
			expect(
				brandedLabel(label)
					.map((p) => p.text)
					.join('')
			).toBe(label);
		}
	});

	it('leaves a name it does not know alone', () => {
		expect(inked('Mistral Large')).toEqual([]);
	});

	/**
	 * Why these are assigned and not hashed like an author's surname. Two of
	 * the three land in one slot, and unlike authors they sit together in one
	 * short list, where a match reads as a bug rather than a coincidence.
	 */
	it('would collide if it were hashed the way a surname is', () => {
		expect(inkFor('gpt')).toBe(inkFor('gemini'));

		const inks = new Set(
			['Claude Haiku 4.5', 'GPT-5.6 Luna', 'Gemini 3.8 Flash'].flatMap(
				(label) =>
					brandedLabel(label)
						.filter((piece) => piece.ink !== '')
						.map((piece) => piece.ink)
			)
		);
		expect(inks.size).toBe(3);
	});
});
