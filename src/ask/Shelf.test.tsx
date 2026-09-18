import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderApp, stubFetch, verified } from '../test/harness';
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
