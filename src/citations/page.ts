import type { AnswerCitation, CitedPage, DocumentDetail } from '../api/types';

/**
 * One page formatter, mirroring `describePage()` on the server, used in the
 * margin note, the drawer, the stamp's label and every empty state. Page 47
 * means nothing until you know which edition, so the work and the creator
 * travel with the number, and both numberings are shown: the one printed on
 * the paper, and the one the PDF counts by.
 */

/** `p. 9 (PDF p. 21)`, or just the PDF page for front matter that has none. */
export function locatePage(page: Pick<CitedPage, 'printed_page' | 'page_no'>) {
	return page.printed_page
		? `p. ${page.printed_page} (PDF p. ${page.page_no})`
		: `PDF p. ${page.page_no}`;
}

/** `Beyond Good and Evil — Friedrich Nietzsche — p. 9 (PDF p. 21)` */
export function describePage(page: CitedPage): string {
	return `${page.work_title} — ${page.creator} — ${locatePage(page)}`;
}

/**
 * The printed page from a document's offset, the same derivation the server
 * makes: `pdf_page = printed_page + page_offset`.
 */
export function printedPage(pageNo: number, pageOffset: number): string | null {
	const printed = pageNo - pageOffset;
	return printed >= 1 ? String(printed) : null;
}

/**
 * A citation's page, from the citation itself when the server sends it, and
 * from `GET /documents/:id` when it does not. `page` is the first of the four
 * additions asked for in `plans/scribe-citations-api.md`; until it lands the
 * margin is drawn from documents this client fetched and cached, which costs a
 * round trip per distinct document and is the whole reason for the ask.
 */
export function pageFromDocument(
	ref: { document_id: string; page_no: number },
	document: DocumentDetail
): CitedPage {
	return {
		work_id: document.work_id,
		work_title: document.work_title,
		creator: document.creator,
		printed_page: printedPage(ref.page_no, document.page_offset),
		document_id: ref.document_id,
		page_no: ref.page_no,
		viewable: document.has_file,
	};
}

export const pageOf = (citation: AnswerCitation): CitedPage | null =>
	citation.page ?? null;
