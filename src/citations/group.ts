import type { AnswerCitation } from '../api/types';
import type { CitationMarker } from './parse';

/**
 * Citations gathered by the book they point into.
 *
 * Under the fold there is no margin to put notes in, and an answer that reads
 * six pages of one book printed the same title and creator six times running.
 * One entry per book, with a badge per reference into it, says the same thing
 * in a quarter of the space.
 *
 * Grouped by document rather than by work: two editions of one book have
 * different pagination, and a page number belongs to the edition it was
 * printed in. The document id is on the citation from the first render, so
 * groups do not re-shuffle as verification lands.
 */

export interface GroupedCitation {
	index: number;
	marker: CitationMarker;
	/** Null until this one's verdict has landed; the badge waits, the group does not. */
	citation: AnswerCitation | null;
}

export interface CitationGroup {
	key: string;
	/** The first citation into this book, which is the one that names it. */
	named: AnswerCitation | null;
	entries: GroupedCitation[];
}

export function groupByDocument(
	markers: CitationMarker[],
	citations: (AnswerCitation | null)[],
	resolved: number
): CitationGroup[] {
	const groups: CitationGroup[] = [];
	const at = new Map<string, CitationGroup>();

	markers.forEach((marker, index) => {
		const citation = citations[index] ?? null;
		const key = citation?.ref?.document_id ?? marker.handle;
		let group = at.get(key);
		if (!group) {
			group = { key, named: citation, entries: [] };
			at.set(key, group);
			groups.push(group);
		}
		group.entries.push({
			index,
			marker,
			citation: index < resolved ? citation : null,
		});
	});

	return groups;
}
