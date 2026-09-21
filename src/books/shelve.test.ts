import { describe, expect, it } from 'vitest';
import { shelve, sortKey } from './shelve';
import type { Work } from '../api/types';

const work = (creator: string, title: string): Work => ({
	work_id: `${creator}:${title}`,
	title,
	creator,
	originally_published: null,
	documents: [],
});

const CATALOGUE = [
	work('Aristotle', 'Politics'),
	work('Aristotle', 'Poetics'),
	work('Immanuel Kant', 'Critique of Judgment'),
	work('G. W. F. Hegel', 'Phenomenology of Spirit'),
	work('G. W. F. Hegel', 'Science of Logic'),
	work('Michel Foucault', 'The Order of Things'),
	work('Michel Foucault', 'Discipline and Punish'),
	work('Michel Foucault', 'Madness and Civilization'),
	work('Max Horkheimer & Theodor W. Adorno', 'Dialectic of Enlightenment'),
];

describe('shelving', () => {
	it('puts the fullest shelf first, and breaks a tie by surname', () => {
		const { shelves } = shelve(CATALOGUE, '');
		expect(shelves.map((shelf) => shelf.creator)).toEqual([
			'Michel Foucault',
			'Aristotle',
			'G. W. F. Hegel',
		]);
	});

	it('gathers single volumes on one shelf, filed by surname', () => {
		const { singles } = shelve(CATALOGUE, '');
		expect(singles.map((shelf) => shelf.creator)).toEqual([
			'Max Horkheimer & Theodor W. Adorno',
			'Immanuel Kant',
		]);
	});

	// A search narrows what is shown, never where a name is filed.
	it('keeps a name on its own shelf when the search leaves one work', () => {
		const found = shelve(CATALOGUE, 'foucault order');
		expect(found.shelves).toHaveLength(1);
		expect(found.shelves[0].holds).toBe(3);
		expect(found.shelves[0].works.map((w) => w.title)).toEqual([
			'The Order of Things',
		]);
		expect(found.singles).toHaveLength(0);
		expect(found).toMatchObject({ works: 1, names: 1 });
	});

	it('files by the first author’s surname', () => {
		expect(sortKey('G. W. F. Hegel')).toBe('Hegel');
		expect(sortKey('Max Horkheimer & Theodor W. Adorno')).toBe(
			'Horkheimer'
		);
		expect(sortKey('Plato')).toBe('Plato');
	});
});
