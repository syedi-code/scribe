import { describe, expect, it } from 'vitest';
import { brandedLabel } from './brand';
import { inkFor } from '../citations/authors';

describe("a model's maker, in its own colour", () => {
	const inked = (label: string) =>
		brandedLabel(label)
			.filter((piece) => piece.ink !== '')
			.map((piece) => [piece.text, piece.ink]);

	it('finds the maker in each of the three names', () => {
		expect(inked('Claude Opus 5')).toEqual([['Claude', 'text-anthropic']]);
		expect(inked('GPT-5.5')).toEqual([['GPT', 'text-openai']]);
		expect(inked('Gemini 3.5 Flash')).toEqual([['Gemini', 'text-google']]);
	});

	it('keeps the rest of the name, exactly', () => {
		for (const label of ['Claude Opus 5', 'GPT-5.5', 'Gemini 3.5 Flash']) {
			expect(brandedLabel(label).map((p) => p.text).join('')).toBe(label);
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
			['Claude Opus 5', 'GPT-5.5', 'Gemini 3.5 Flash'].flatMap((label) =>
				brandedLabel(label)
					.filter((piece) => piece.ink !== '')
					.map((piece) => piece.ink)
			)
		);
		expect(inks.size).toBe(3);
	});
});
