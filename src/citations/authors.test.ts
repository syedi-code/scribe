import { describe, expect, it } from 'vitest';
import {
	AUTHOR_INKS,
	inkFor,
	inkedName,
	sliceName,
	splitAuthors,
	surnamesOf,
} from './authors';

/**
 * Every case here is a creator string the production library actually holds.
 */
describe('a creator string, as the library writes them', () => {
	it('splits on every separator the catalogue uses', () => {
		expect(splitAuthors('Max Horkheimer & Theodor W. Adorno')).toEqual([
			'Max Horkheimer',
			'Theodor W. Adorno',
		]);
		expect(splitAuthors('Griffin; Ledbetter; Sparks')).toEqual([
			'Griffin',
			'Ledbetter',
			'Sparks',
		]);
		expect(splitAuthors('Vidal, Smith, Rotta & Prew')).toEqual([
			'Vidal',
			'Smith',
			'Rotta',
			'Prew',
		]);
	});

	it('finds the surname through initials, particles and suffixes', () => {
		expect(sliceName('G. W. Leibniz').lastName).toBe('Leibniz');
		expect(sliceName('Abu al-Ala al-Maarri').lastName).toBe('al-Maarri');
		expect(sliceName('Martin Luther King Jr.')).toEqual({
			firstParts: 'Martin Luther ',
			lastName: 'King',
			suffix: ' Jr.',
		});
		expect(sliceName('Al-Ghazālī')).toEqual({
			firstParts: '',
			lastName: 'Al-Ghazālī',
			suffix: '',
		});
		expect(sliceName('Ibn ‘Arabī').lastName).toBe('‘Arabī');
	});
});

describe('the ink a surname is written in', () => {
	it('is the same every time, and always in the palette', () => {
		for (const name of ['Nietzsche', 'Foucault', 'al-Maarri', 'Plato']) {
			expect(inkFor(name)).toBe(inkFor(name));
			expect(inkFor(name)).toBeGreaterThanOrEqual(0);
			expect(inkFor(name)).toBeLessThan(AUTHOR_INKS);
		}
	});

	// The same person must not change ink with the keyboard they were typed on.
	it('does not change with the shape of an apostrophe', () => {
		expect(inkFor('Ibn ‘Arabī')).toBe(inkFor("Ibn 'Arabī"));
		expect(inkFor('Ibn ʼArabī')).toBe(inkFor("Ibn 'Arabī"));
	});

	it('does not change with case or stray space', () => {
		expect(inkFor('  nietzsche ')).toBe(inkFor('Nietzsche'));
	});
});

describe('the surnames looked for in an answer', () => {
	it('leaves out one that would match too much prose', () => {
		expect(surnamesOf(['Malcolm X'])).toEqual([]);
		expect(surnamesOf(['Friedrich Nietzsche'])).toEqual(['Nietzsche']);
	});

	it('offers the longest first, so a particle is not eaten', () => {
		const found = surnamesOf(['Abu al-Ala al-Maarri', 'Thomas Kuhn']);
		expect(found[0].length).toBeGreaterThanOrEqual(found[1].length);
	});
});

describe('a name inked for a reference', () => {
	it('keeps the string exactly, punctuation and all', () => {
		for (const creator of [
			'Griffin; Ledbetter; Sparks',
			'Max Horkheimer & Theodor W. Adorno',
			'Martin Luther King Jr.',
			'Ibn ‘Arabī',
			'Malcolm X',
		]) {
			expect(
				inkedName(creator)
					.map((piece) => piece.text)
					.join('')
			).toBe(creator);
		}
	});

	it('inks the surname and nothing before it', () => {
		const pieces = inkedName('Friedrich Nietzsche');
		expect(pieces.find((p) => p.text === 'Friedrich ')?.ink).toBe(-1);
		expect(pieces.find((p) => p.text === 'Nietzsche')?.ink).toBe(
			inkFor('Nietzsche')
		);
	});

	// An attribution has nothing for a one-letter name to collide with.
	it('inks a one-letter surname, unlike the prose', () => {
		expect(inkedName('Malcolm X').find((p) => p.text === 'X')?.ink).toBe(
			inkFor('X')
		);
	});

	it('inks every author in a joint credit', () => {
		const inked = inkedName('Max Horkheimer & Theodor W. Adorno')
			.filter((piece) => piece.ink >= 0)
			.map((piece) => piece.text);
		expect(inked).toEqual(['Horkheimer', 'Adorno']);
	});
});
