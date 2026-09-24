import { describe, expect, it } from 'vitest';
import { insertMention, mentionAt, worksFor } from './mention';
import type { Work } from '../api/types';

const work = (title: string, creator: string): Work => ({
	work_id: title,
	title,
	creator,
	originally_published: null,
	documents: [],
});

const LIBRARY = [
	work('Beyond Good and Evil', 'Friedrich Nietzsche'),
	work('The Gay Science', 'Friedrich Nietzsche'),
	work('Critique of Pure Reason', 'Immanuel Kant'),
	work('Groundwork of the Metaphysics of Morals', 'Immanuel Kant'),
	work('The Meccan Revelations', "Ibn 'Arabī"),
	work('Good Economics for Hard Times', 'Banerjee & Duflo'),
];
const titles = (query: string) =>
	worksFor(LIBRARY, query).map((found) => found.title);

describe('a mention being typed', () => {
	it('starts at an @ at the start of a word, up to the caret', () => {
		expect(mentionAt('What does @beyo', 15)).toEqual({
			start: 10,
			query: 'beyo',
		});
		expect(mentionAt('@', 1)).toEqual({ start: 0, query: '' });
	});

	it('is not an email address, a line past, or a space after the @', () => {
		expect(mentionAt('write to me@example.org', 23)).toBeNull();
		expect(mentionAt('@kant\nand then', 14)).toBeNull();
		expect(mentionAt('look @ this', 11)).toBeNull();
		expect(mentionAt('no mention here', 15)).toBeNull();
	});
});

describe('the books a mention could mean', () => {
	it('puts a title that begins with it first', () => {
		expect(titles('good')[0]).toBe('Good Economics for Hard Times');
		expect(titles('good')).toContain('Beyond Good and Evil');
	});

	it('finds a book by its author', () => {
		expect(titles('kant')).toEqual([
			'Critique of Pure Reason',
			'Groundwork of the Metaphysics of Morals',
		]);
	});

	it('matches the start of a word, not letters inside one', () => {
		// `ni` is Nietzsche, not the ni in Banerjee or in *punish*.
		expect(titles('ni')).toEqual([
			'Beyond Good and Evil',
			'The Gay Science',
		]);
	});

	it('needs every word it was given', () => {
		expect(titles('kant pure')).toEqual(['Critique of Pure Reason']);
	});

	it('reads past case, accents and apostrophes', () => {
		expect(titles('ARABI')).toEqual(['The Meccan Revelations']);
		expect(titles('nietz')).toHaveLength(2);
	});

	it('offers the shelf when nothing is typed yet, and stops at the limit', () => {
		expect(worksFor(LIBRARY, '', 3)).toHaveLength(3);
		expect(titles('zzz')).toEqual([]);
	});
});

describe('taking a book', () => {
	it('replaces the mention with the title and a space, caret after it', () => {
		const text = 'Is @beyo about truth?';
		const next = insertMention(
			text,
			{ start: 3, query: 'beyo' },
			8,
			'Beyond Good and Evil'
		);
		expect(next.text).toBe('Is Beyond Good and Evil about truth?');
		expect(next.caret).toBe('Is Beyond Good and Evil '.length);
	});

	it('adds a space only where there is not one already', () => {
		const next = insertMention(
			'@kan',
			{ start: 0, query: 'kan' },
			4,
			'Critique'
		);
		expect(next.text).toBe('Critique ');
		expect(next.caret).toBe(9);
	});
});
