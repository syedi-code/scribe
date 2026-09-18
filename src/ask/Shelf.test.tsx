import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import {
	assistant,
	chat,
	renderApp,
	stubFetch,
	verified,
} from '../test/harness';
import { groupByDocument } from '../citations/group';
import { MarginNotes } from './MarginNotes';
import type { AnswerCitation } from '../api/types';
import type { CitationMarker } from '../citations/parse';

/**
 * References gathered by the book they point into.
 *
 * Six citations into one work printed its title and creator six times running,
 * which under the fold was most of a phone screen. Wide, the margin is
 * untouched: a note per citation, beside the sentence it supports.
 */

const into = (documentId: string, pageNo: number, quote: string) => {
	const citation = verified('P1', quote);
	return {
		...citation,
		ref: { document_id: documentId, page_no: pageNo },
		page: { ...citation.page!, document_id: documentId, page_no: pageNo },
	} as AnswerCitation;
};

const marker = (handle: string, at: number): CitationMarker =>
	({ handle, start: at, end: at + 1, quote: 'q', checked: [0, 1] }) as never;

const GENEALOGY = 'doc-genealogy';
const ZARATHUSTRA = 'doc-zarathustra';

const CITATIONS = [
	into(GENEALOGY, 146, 'the will to truth'),
	into(GENEALOGY, 147, 'a faith in the ascetic ideal'),
	into(GENEALOGY, 149, 'let us define our own task'),
	into(ZARATHUSTRA, 41, 'the spirit that would bear'),
];
const MARKERS = CITATIONS.map((_, at) => marker(`P${at}`, at));

describe('references grouped by the book they are into', () => {
	it('makes one group per document, in the order they were cited', () => {
		const groups = groupByDocument(MARKERS, CITATIONS, CITATIONS.length);
		expect(groups).toHaveLength(2);
		expect(groups[0].entries).toHaveLength(3);
		expect(groups[1].entries).toHaveLength(1);
	});

	// The group is stable from the first render; only the badges wait.
	it('groups before the verdicts land, and holds the badges back', () => {
		const groups = groupByDocument(MARKERS, CITATIONS, 0);
		expect(groups).toHaveLength(2);
		expect(groups.flatMap((g) => g.entries).every((e) => !e.citation)).toBe(
			true
		);
	});

	it('prints each book once, with a badge for every reference into it', () => {
		stubFetch();
		renderApp(
			<MarginNotes
				markers={MARKERS}
				citations={CITATIONS}
				resolved={CITATIONS.length}
				lit={null}
				onLight={() => {}}
				turn={null}
				anchors={new Map()}
			/>
		);

		// One title per book under the fold, and one per citation in the
		// margin: both forms are in the tree, and the container query picks.
		expect(screen.getAllByText('Beyond Good and Evil')).toHaveLength(
			CITATIONS.length + 2
		);

		const badges = screen
			.getAllByRole('button')
			.filter((button) =>
				button
					.getAttribute('aria-label')
					?.startsWith('found on the page')
			);
		expect(badges).toHaveLength(CITATIONS.length);
	});
});

describe('a book whose references have not been checked yet', () => {
	// While the answer was still being written every entry printed `a page it
	// was never shown` as its title, which is a failure that had not happened.
	const searched = assistant([
		{
			type: 'tool-search_pages',
			toolCallId: 't1',
			state: 'output-available',
			input: { query: 'will to truth' },
			output: [
				{
					handle: 'P0',
					ref: { document_id: GENEALOGY, page_no: 146 },
					work_id: 'w-genealogy',
					work_title: 'On the Genealogy of Morals',
					creator: 'Friedrich Nietzsche',
					printed_page: '146',
				},
			],
		} as never,
	]);

	it('is named from the search that showed it, not called a failure', () => {
		stubFetch();
		renderApp(
			<MarginNotes
				markers={[marker('P0', 0)]}
				citations={[null]}
				resolved={0}
				lit={null}
				onLight={() => {}}
				turn={null}
				anchors={new Map()}
			/>,
			{ state: chat({ messages: [searched], atHome: false }) }
		);

		expect(
			screen.getAllByText('On the Genealogy of Morals').length
		).toBeGreaterThan(0);
		expect(screen.queryByText('a page it was never shown')).toBeNull();
	});

	it('says it is checking when nothing has named it yet', () => {
		stubFetch();
		renderApp(
			<MarginNotes
				markers={[marker('P9', 0)]}
				citations={[null]}
				resolved={0}
				lit={null}
				onLight={() => {}}
				turn={null}
				anchors={new Map()}
			/>
		);
		expect(screen.queryByText('a page it was never shown')).toBeNull();
	});
});

describe('a book with more references than a row can count', () => {
	it('shows each verdict once, with how many', () => {
		const many = Array.from({ length: 7 }, (_, at) =>
			into(GENEALOGY, 140 + at, `the will to truth ${at}`)
		);
		const missed = {
			...into(GENEALOGY, 150, 'a faith in the ascetic ideal'),
			status: 'unverified',
			reason: 'not_found',
		} as AnswerCitation;
		const citations = [...many, missed];
		stubFetch();
		renderApp(
			<MarginNotes
				markers={citations.map((_, at) => marker(`P${at}`, at))}
				citations={citations}
				resolved={citations.length}
				lit={null}
				onLight={() => {}}
				turn={null}
				anchors={new Map()}
			/>
		);

		expect(
			screen.getByRole('button', { name: '7 quotes: found on the page' })
		).toBeTruthy();
		// The one that failed is not lost inside a total.
		expect(
			screen.getByRole('button', { name: '1 quote: not on this page' })
		).toBeTruthy();
	});
});


/**
 * A grid track is min-content wide unless it is told it may be narrower, and
 * a book with a long name is wider than a phone. The track grew to the name,
 * the shelf grew with it, and the line ran off the right of the screen
 * carrying the pips — the part that holds the verdict — past the edge with
 * it. The  on the name could never fire, because nothing above it
 * was ever narrower than the name.
 *
 * jsdom lays nothing out, so this is asserted where it is written.
 */
describe('the shelf under the fold', () => {
	const SOURCE = readFileSync('src/ask/MarginNotes.tsx', 'utf8');

	it('gives its column leave to be narrower than the longest title', () => {
		const fold = SOURCE.slice(
			SOURCE.indexOf('@max-fold:grid'),
			SOURCE.indexOf('@max-fold:grid') + 120
		);

		expect(fold).toContain('grid-cols-[minmax(0,1fr)]');
	});

	it('still gives the name up before the pips do', () => {
		const shelf = readFileSync('src/ask/Shelf.tsx', 'utf8');

		expect(shelf).toContain('truncate');
		expect(shelf).toContain('min-w-0');
		expect(shelf).toContain('shrink-0');
	});
});
