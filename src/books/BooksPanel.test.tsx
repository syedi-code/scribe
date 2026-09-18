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
		work('Frantz Fanon', 'The Wretched of the Earth'),
		work('Michel Foucault', 'Discipline and Punish'),
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

// A creator's name is now one span per ink, so no single text node holds it:
// the shelf is found by the heading's own text instead.
const heading = (name: string) => (_: string, element: Element | null) =>
	element?.tagName === 'H2' && element.textContent === name;
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
		expect(screen.getByText('4 works · 2 names')).toBeTruthy();
	});

	it('says which works cannot be searched, rather than listing them alike', async () => {
		stubFetch(CATALOGUE);
		renderApp(<BooksPanel />);
		await shelf('Michel Foucault');

		expect(screen.getByText('scan only')).toBeTruthy();
		expect(screen.getAllByText('353 pages')).toHaveLength(3);
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

	it('says so when nothing matches, in the reader’s words', async () => {
		stubFetch(CATALOGUE);
		renderApp(<BooksPanel />);
		await shelf('Michel Foucault');

		fireEvent.change(search(), { target: { value: 'kierkegaard' } });
		expect(screen.getByText(/Nothing on the shelves matches/)).toBeTruthy();
	});
});
