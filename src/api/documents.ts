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
const scans = new Map<string, Promise<string | null>>();

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

/**
 * Where the scan itself can be read, signed for this reader.
 *
 * Null when the document has no file behind it, which is a fact about the
 * document rather than a failure to fetch one. Signed once per document and
 * kept, because the renderer asks for the file in pieces as pages are turned
 * and every piece carries the same token.
 */
export function scanUrl(documentId: string): Promise<string | null> {
	let pending = scans.get(documentId);
	if (!pending) {
		pending = loadDocument(documentId)
			.then(async ({ file_key }) => {
				if (!file_key) return null;
				const { token } = await api.post<{ token: string }>(
					'/files/sign',
					{ path: file_key }
				);
				// A segment at a time: the key keeps its slashes, and a
				// filename with a space or a comma in it — six of the
				// library's have one — survives the trip.
				const path = file_key
					.split('/')
					.map(encodeURIComponent)
					.join('/');
				return `/api/files/${path}?token=${encodeURIComponent(token)}`;
			})
			.catch((error: unknown) => {
				scans.delete(documentId);
				throw error;
			});
		scans.set(documentId, pending);
	}
	return pending;
}
