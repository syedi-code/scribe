import { useEffect, useMemo, useState } from 'react';
import { loadDocument } from '../api/documents';
import type { AnswerCitation, DocumentDetail } from '../api/types';

/**
 * The works an answer cited, by name and by creator.
 *
 * The prose needs these to set a title in the reading face and a surname in
 * its own ink. They are on the citation once the server sends `page`
 * (`plans/scribe-citations-api.md`, change 1) and, until it does, on the
 * document behind its `ref` — the same fallback every component already makes
 * through `useCitedPage`. Reading `citation.page` alone is how the prose came
 * to be the one surface that showed neither: in production that field is not
 * there, so the pass had nothing to look for and quietly did nothing.
 *
 * `loadDocument` holds one promise per id for the life of the tab, and the
 * margin asks for the same documents, so this usually costs no request at all.
 */
export function useCitedWorks(
	citations: readonly AnswerCitation[] | undefined
): { titles: string[]; creators: string[] } {
	const wanted = useMemo(() => {
		const ids = new Set<string>();
		for (const citation of citations ?? []) {
			if (!citation.page && citation.ref) {
				ids.add(citation.ref.document_id);
			}
		}
		return [...ids].sort();
	}, [citations]);

	// The array is rebuilt on every streamed token; its contents are not.
	const key = wanted.join(',');
	const [known, setKnown] = useState<ReadonlyMap<string, DocumentDetail>>(
		new Map()
	);

	useEffect(() => {
		if (!key) return;
		let live = true;
		void Promise.all(
			key.split(',').map((id) =>
				loadDocument(id)
					.then((document) => [id, document] as const)
					.catch(() => null)
			)
		).then((found) => {
			if (!live) return;
			setKnown((had) => {
				const next = new Map(had);
				for (const pair of found) {
					if (pair) next.set(pair[0], pair[1]);
				}
				return next.size === had.size ? had : next;
			});
		});
		return () => {
			live = false;
		};
	}, [key]);

	return useMemo(() => {
		const titles = new Set<string>();
		const creators = new Set<string>();
		for (const citation of citations ?? []) {
			const named =
				citation.page ??
				(citation.ref ? known.get(citation.ref.document_id) : null);
			if (named?.work_title) titles.add(named.work_title);
			if (named?.creator) creators.add(named.creator);
		}
		// Longest first, so `The Genealogy of Morals` is matched before
		// `Genealogy` would be.
		return {
			titles: [...titles].sort((a, b) => b.length - a.length),
			creators: [...creators],
		};
	}, [citations, known]);
}
