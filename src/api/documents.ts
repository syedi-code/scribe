import { api } from './client';
import type { DocumentDetail, PageText } from './types';

/**
 * Documents and page text, fetched once per thing.
 *
 * A citation should arrive already knowing which book it is
 * (`plans/scribe-citations-api.md`, change 1). Until it does, the margin is
 * drawn from these, and five citations across three works would otherwise be
 * three round trips every time a note re-rendered. One promise per id, kept for
 * the life of the tab: a document's pagination does not change while someone
 * is reading an answer about it.
 */

const documents = new Map<string, Promise<DocumentDetail>>();
const pages = new Map<string, Promise<PageText[]>>();

export function loadDocument(id: string): Promise<DocumentDetail> {
	let pending = documents.get(id);
	if (!pending) {
		pending = api
			.get<{ document: DocumentDetail }>(`/documents/${id}`)
			.then((body) => body.document)
			.catch((error: unknown) => {
				documents.delete(id);
				throw error;
			});
		documents.set(id, pending);
	}
	return pending;
}

/** At most five consecutive pages, which is what the route allows. */
export function loadPages(
	documentId: string,
	from: number,
	to = from
): Promise<PageText[]> {
	const key = `${documentId}#${from}-${to}`;
	let pending = pages.get(key);
	if (!pending) {
		pending = api
			.get<{ pages: PageText[] }>(
				`/documents/${documentId}/pages?from=${from}&to=${to}`
			)
			.then((body) => body.pages)
			.catch((error: unknown) => {
				pages.delete(key);
				throw error;
			});
		pages.set(key, pending);
	}
	return pending;
}
