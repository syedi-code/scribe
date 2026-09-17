/**
 * alexandria's payloads, as this app reads them.
 *
 * The API is additive-only: fields are never removed or retyped, so everything
 * here keeps working as it grows. Four fields are asked for in
 * `plans/scribe-citations-api.md` and are typed optional until they land —
 * `page`, `context`, `matched_prefix` and `marker`. Every one of them has a
 * fallback in this client, so the interface is honest with or without them.
 */

export interface Identity {
	user: {
		id: string;
		email: string;
		name: string | null;
		role: 'admin' | 'member';
	};
}

export interface Model {
	id: string;
	label: string;
	provider: 'anthropic' | 'openai' | 'google';
	acceptsFiles: boolean;
}

export interface ModelsResponse {
	models: Model[];
	default_model_id: string | null;
}

export interface Conversation {
	id: string;
	user_id: string;
	title: string | null;
	model_id: string;
	created_at: string;
	updated_at: string;
}

export interface PageRef {
	document_id: string;
	page_no: number;
}

/** A page a citation points at, as a reader recognises it. */
export interface CitedPage {
	work_id: string;
	work_title: string;
	creator: string;
	/** The number printed on the paper. Front matter has none. */
	printed_page: string | null;
	document_id: string;
	page_no: number;
	/** Whether there is a scan to show. */
	viewable: boolean;
}

/** The page's own words around a match, which is what makes a quote checkable. */
export interface QuoteContext {
	before: string;
	/** The page's wording, not the model's — the difference is the point. */
	text: string;
	after: string;
	spans_page_break?: boolean;
}

export type CitationStatus = 'verified' | 'unverified' | 'unverifiable';

export type CitationReason =
	| 'not_found'
	| 'partial_match'
	| 'quote_too_short'
	| 'no_such_page'
	| 'unknown_handle'
	| 'no_text_layer';

/** One citation in an answer, with the result of looking for it on its page. */
export type AnswerCitation = {
	handle: string;
	quote: string;
	ref: PageRef | null;
	page?: CitedPage | null;
	context?: QuoteContext | null;
	/** Where a `partial_match` stopped matching. */
	matched_prefix?: string;
	/** Offsets into the answer text, once the server sends them. */
	marker?: { start: number; end: number };
} & (
	| { status: 'verified'; matched?: PageRef[]; reason?: undefined }
	| { status: 'unverified'; reason: CitationReason }
	| { status: 'unverifiable'; reason: 'no_text_layer' }
);

export interface DocumentDetail {
	document_id: string;
	label: string | null;
	page_count: number | null;
	page_offset: number;
	text: string;
	has_file: boolean;
	work_id: string;
	work_title: string;
	creator: string;
	file_key: string | null;
}

export interface PageText {
	ref: PageRef;
	work_id: string;
	work_title: string;
	creator: string;
	printed_page: string | null;
	/** Null when the page has no text layer. */
	text: string | null;
}
