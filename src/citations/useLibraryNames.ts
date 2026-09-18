import { useEffect, useState } from 'react';
import { libraryWorks } from '../api/library';
import { surnamesOf } from './authors';

/**
 * Every work the library holds, and everyone who wrote one.
 *
 * The fallback behind the model's own `<title>` and `<author>` marks. It
 * forgets — that is the whole reason `CLAUDE.md` used to forbid asking it —
 * so a name it misses is still caught if the library happens to know it.
 *
 * Only the catalogue, which is one edge-cached fetch the shelves already make
 * and which is held for the life of the tab. It is allowed to fail: a name
 * left grey is a smaller loss than a reading surface that waits on a list.
 */

let held: { titles: string[]; surnames: string[] } | null = null;

const EMPTY = { titles: [] as string[], surnames: [] as string[] };

export function useLibraryNames(): { titles: string[]; surnames: string[] } {
	const [names, setNames] = useState(held ?? EMPTY);

	useEffect(() => {
		if (held) return;
		let live = true;
		void libraryWorks()
			.then((works) => {
				held = {
					// Longest first, so `The Genealogy of Morals` is matched
					// before `Genealogy` would be.
					titles: [...new Set(works.map((work) => work.title))].sort(
						(a, b) => b.length - a.length
					),
					surnames: surnamesOf(works.map((work) => work.creator)),
				};
				if (live) setNames(held);
			})
			.catch(() => undefined);
		return () => {
			live = false;
		};
	}, []);

	return names;
}
