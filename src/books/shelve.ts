import { sliceName, splitAuthors } from '../citations/authors';
import type { Work } from '../api/types';

export interface Shelf {
	creator: string;
	/** Everything the library holds by them, whatever the search says. */
	holds: number;
	works: Work[];
}

export interface Shelves {
	/** Names with more than one work, the fullest first. */
	shelves: Shelf[];
	/** One work each, gathered on a single shelf so fifty names do not each
	 *  cost a heading for one line. */
	singles: Shelf[];
	works: number;
	names: number;
}

/** Where the index jumps to. */
export const SINGLES_ID = 'shelf-singles';

export const shelfId = (creator: string) =>
	`shelf-${creator.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-')}`;

/** Every word must appear somewhere, so "Foucault prison" finds one work. */
function matches(work: Work, terms: string[]): boolean {
	const haystack = `${work.title} ${work.creator} ${
		work.originally_published ?? ''
	}`.toLowerCase();
	return terms.every((term) => haystack.includes(term));
}

/** Filed the way a library files them: by the first author's surname. */
export function sortKey(creator: string): string {
	const first = splitAuthors(creator)[0] ?? creator;
	return sliceName(first).lastName || creator;
}

const bySurname = (a: Shelf, b: Shelf) =>
	sortKey(a.creator).localeCompare(sortKey(b.creator), undefined, {
		sensitivity: 'base',
	}) || a.creator.localeCompare(b.creator);

/**
 * The shelves, fullest first.
 *
 * Where a name is filed is decided by what the library holds of them, never
 * by what the search left: `foucault order` is one work, and it is still on
 * Foucault's shelf rather than among the single volumes.
 */
export function shelve(catalogue: Work[], search: string): Shelves {
	const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
	const byCreator = new Map<string, Shelf>();
	for (const work of catalogue) {
		const shelf = byCreator.get(work.creator);
		if (shelf) shelf.holds++;
		else
			byCreator.set(work.creator, {
				creator: work.creator,
				holds: 1,
				works: [],
			});
		if (terms.length === 0 || matches(work, terms)) {
			byCreator.get(work.creator)!.works.push(work);
		}
	}

	const found = [...byCreator.values()].filter(
		(shelf) => shelf.works.length > 0
	);
	const shelves = found
		.filter((shelf) => shelf.holds > 1)
		.sort((a, b) => b.holds - a.holds || bySurname(a, b));
	const singles = found.filter((shelf) => shelf.holds === 1).sort(bySurname);

	return {
		shelves,
		singles,
		works: found.reduce((total, shelf) => total + shelf.works.length, 0),
		names: found.length,
	};
}
