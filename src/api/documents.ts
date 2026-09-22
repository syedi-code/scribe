import { api, apiErrorOf } from './client';
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
const scans = new Map<string, Promise<ScanFile>>();
const files = new Map<string, Promise<string | null>>();

/** Forgets a failed fetch, so the next reader to ask tries again. */
function once<T>(
	cache: Map<string, Promise<T>>,
	key: string,
	run: () => Promise<T>
) {
	let pending = cache.get(key);
	if (!pending) {
		pending = run().catch((error: unknown) => {
			cache.delete(key);
			throw error;
		});
		cache.set(key, pending);
	}
	return pending;
}

export function loadDocument(id: string): Promise<DocumentDetail> {
	return once(documents, id, () =>
		api
			.get<{ document: DocumentDetail }>(`/documents/${id}`)
			.then((body) => body.document)
	);
}

/**
 * At most five consecutive pages, and only around a page this reader's own
 * answers cited: alexandria serves nothing further from a citation than the
 * page either side of it.
 */
export function loadPages(
	documentId: string,
	from: number,
	to = from
): Promise<PageText[]> {
	return once(pages, `${documentId}#${from}-${to}`, () =>
		api
			.get<{ pages: PageText[] }>(
				`/cited/${documentId}/pages?from=${from}&to=${to}`
			)
			.then((body) => body.pages)
	);
}

/** One page of a scan: a one-page PDF cut from the book, or a rendered image. */
export interface ScanFile {
	contentType: string;
	bytes: Uint8Array;
}

/**
 * The scan of one cited page, on Paid. Never the book: alexandria cuts the
 * page out and sends that, so a reader holds the page they were cited and
 * nothing else. Refusals keep their code (`SCAN_REQUIRES_PAID`,
 * `PAGE_NOT_CITED`, `SCAN_UNAVAILABLE`) for the scan view to say why.
 */
export function loadScanPage(
	documentId: string,
	pageNo: number
): Promise<ScanFile> {
	return once(scans, `${documentId}#${pageNo}`, async () => {
		const path = `/cited/${documentId}/pages/${pageNo}/scan`;
		const response = await fetch(`/api${path}`);
		if (!response.ok)
			throw await apiErrorOf(response, `GET ${path} failed`);
		return {
			contentType:
				response.headers.get('content-type') ?? 'application/pdf',
			bytes: new Uint8Array(await response.arrayBuffer()),
		};
	});
}

/**
 * The whole file, signed — the admin's alone, and only for opening it
 * elsewhere. Null when the document has no file behind it.
 */
export function fileUrl(documentId: string): Promise<string | null> {
	return once(files, documentId, () =>
		loadDocument(documentId).then(async ({ file_key }) => {
			if (!file_key) return null;
			const { token } = await api.post<{ token: string }>('/files/sign', {
				path: file_key,
			});
			// A segment at a time: the key keeps its slashes, and a filename
			// with a space or a comma in it — six of the library's have one —
			// survives the trip.
			const path = file_key.split('/').map(encodeURIComponent).join('/');
			return `/api/files/${path}?token=${encodeURIComponent(token)}`;
		})
	);
}
