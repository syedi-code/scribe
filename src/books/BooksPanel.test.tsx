import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderApp, stubFetch } from '../test/harness';
import { BooksPanel } from './BooksPanel';
import type { Work } from '../api/types';

/**
 * The shelves. `libraryWorks()` caches per tab, so one catalogue serves every
 * test in this file — which is the point: the search is done here, not on the
 * server, and never costs a second fetch.
 */
const work = (
	creator: string,
	title: string,
	over: Partial<Work> = {}
): Work => ({
	work_id: `${creator}:${title}`,
	title,
	creator,
	originally_published: '1975',
	documents: [
		{
			document_id: 'd1',
			label: null,
			page_count: 353,
			text: 'searchable',
			has_file: true,
		},
	],
	...over,
});

// As alexandria returns it: ordered by creator, then title.
const CATALOGUE = {
	works: [
		work('Frantz Fanon', 'Black Skin, White Masks'),
		work('Hannah Arendt', 'The Human Condition'),
		work('Frantz Fanon', 'The Wretched of the Earth'),
		work('Michel Foucault', 'Discipline and Punish'),
		work('Michel Foucault', 'The Birth of the Clinic'),
		work('Michel Foucault', 'The Order of Things', {
			documents: [
				{
					document_id: 'd2',
					label: null,
					page_count: 449,
					text: 'scan',
					has_file: true,
				},
			],
		}),
	],
};

const search = () => screen.getByRole('searchbox');

// A creator's name is one span per ink, so no single text node holds it: the
// shelf is found by the heading's first span, which is the name alone.
const heading = (name: string) => (_: string, element: Element | null) =>
	element?.tagName === 'H2' &&
	element.firstElementChild?.textContent === name;
const shelf = (name: string) => screen.findByText(heading(name));
const noShelf = (name: string) => screen.queryByText(heading(name));

describe('the shelves', () => {
	it('lists every work under whoever wrote it, once', async () => {
		stubFetch(CATALOGUE);
		renderApp(<BooksPanel />);

		expect(await shelf('Michel Foucault')).toBeTruthy();
		expect(screen.getAllByText(heading('Frantz Fanon'))).toHaveLength(1);
		expect(screen.getByText('Discipline and Punish')).toBeTruthy();
		expect(screen.getByText('The Wretched of the Earth')).toBeTruthy();
		expect(screen.getByText('6 works · 3 names')).toBeTruthy();
	});

	it('says which works cannot be searched, rather than listing them alike', async () => {
		stubFetch(CATALOGUE);
		renderApp(<BooksPanel />);
		await shelf('Michel Foucault');

		expect(screen.getByText('scan only')).toBeTruthy();
		expect(screen.getAllByText('353 pages')).toHaveLength(5);
	});

	// The list is not an offer of the files behind it, and says so.
	it('says it does not hand over the books', async () => {
		stubFetch(CATALOGUE);
		renderApp(<BooksPanel />);
		await shelf('Michel Foucault');

		expect(screen.getByText(/does not provide the PDFs/)).toBeTruthy();
		expect(screen.getByText(/alexandria API/)).toBeTruthy();
	});

	it('sets a book’s name as a book’s name', async () => {
		stubFetch(CATALOGUE);
		renderApp(<BooksPanel />);
		expect(
			(await screen.findByText('Discipline and Punish')).className
		).toContain('work-title');
	});

	it('narrows on every word, across the title and the name', async () => {
		stubFetch(CATALOGUE);
		renderApp(<BooksPanel />);
		await shelf('Michel Foucault');

		fireEvent.change(search(), { target: { value: 'foucault order' } });
		expect(screen.getByText('The Order of Things')).toBeTruthy();
		expect(screen.queryByText('Discipline and Punish')).toBeNull();
		expect(noShelf('Frantz Fanon')).toBeNull();
		expect(screen.getByText('1 work · 1 name')).toBeTruthy();
	});

	it('files the fullest shelf first, and single volumes together at the end', async () => {
		stubFetch(CATALOGUE);
		renderApp(<BooksPanel />);
		await shelf('Michel Foucault');

		const headings = screen
			.getAllByRole('heading', { level: 2 })
			.map((h) => h.firstElementChild?.textContent);
		expect(headings).toEqual([
			'Michel Foucault',
			'Frantz Fanon',
			'One work each',
		]);
		expect(screen.getByText('3 works')).toBeTruthy();
		// Arendt is on the shared shelf, named beside her work.
		expect(noShelf('Hannah Arendt')).toBeNull();
		expect(screen.getByText('The Human Condition')).toBeTruthy();
	});

	it('offers a jump to each fuller shelf, and hides it while searching', async () => {
		stubFetch(CATALOGUE);
		renderApp(<BooksPanel />);
		await shelf('Michel Foucault');

		const index = screen.getByRole('navigation', {
			name: 'Jump to a shelf',
		});
		expect(index.textContent).toContain('Foucault');
		expect(index.textContent).toContain('Fanon');

		fireEvent.change(search(), { target: { value: 'order' } });
		expect(screen.queryByRole('navigation')).toBeNull();
	});

	it('says so when nothing matches, in the reader’s words', async () => {
		stubFetch(CATALOGUE);
		renderApp(<BooksPanel />);
		await shelf('Michel Foucault');

		fireEvent.change(search(), { target: { value: 'kierkegaard' } });
		expect(screen.getByText(/Nothing on the shelves matches/)).toBeTruthy();
	});
});
