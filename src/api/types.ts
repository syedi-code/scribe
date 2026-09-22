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
		/** Absent on a worker that predates plans. */
		plan?: 'free' | 'paid';
	};
}

export interface Model {
	id: string;
	label: string;
	provider: 'anthropic' | 'openai' | 'google';
	acceptsFiles: boolean;
	/** Only the admin may choose it, and only the admin is ever sent it. */
	adminOnly?: boolean;
}

/**
 * What this reader may still ask for this month.
 *
 * `limit` is null for an unlimited reader — the admin — and rendering that as
 * a number is how "4 of null" gets shipped. Everything that reads this treats
 * null as *no ceiling*, never as *zero*.
 *
 * It arrives twice: on `GET /models`, which is asked once a tab, and again on
 * the `finish` of every answer, where `used` already counts the turn that has
 * just finished. The later one wins.
 */
export interface Allowance {
	plan: 'free' | 'paid';
	used: number;
	limit: number | null;
	/** Midnight UTC on the first of next month. */
	resets_at: string;
}

/**
 * What a plan gives, as `GET /plans` says — read from the numbers and the
 * models alexandria enforces, so the plans cannot promise what it refuses.
 */
export interface PlanOffer {
	id: 'free' | 'paid';
	turns_per_month: number;
	models: { id: string; label: string; provider: string }[];
	/**
	 * Whether the scan of a cited page opens, one page at a time. Absent on a
	 * worker that predates it, which served the whole file to every plan.
	 */
	page_scans?: boolean;
	/** Null until there is a price to show. */
	price: { amount_cents: number; currency: string; interval: 'month' } | null;
}

/** `GET /billing`: the plan, and the subscription that keeps it on. */
export interface Billing {
	plan: 'free' | 'paid';
	/** Whether Stripe holds a customer for this reader, so a portal to open. */
	manageable: boolean;
	subscription: {
		status: string;
		/** When it renews; null once it has been cancelled to end. */
		renews_at: string | null;
		/** When it ends, once cancelled; Paid stays on until then. */
		ends_at: string | null;
	} | null;
}

export interface ModelsResponse {
	models: Model[];
	/**
	 * Set up on the worker but not on this reader's plan. Absent on a worker
	 * that predates it, where such a model was simply left out of `models`.
	 */
	locked?: Model[];
	default_model_id: string | null;
	/** Absent on a worker that predates the turn limit. */
	allowance?: Allowance;
}

/** A work on the shelves, as `GET /catalogue` lists it. */
export interface Work {
	work_id: string;
	title: string;
	creator: string;
	originally_published: string | null;
	documents: {
		document_id: string;
		label: string | null;
		page_count: number;
		/** `searchable` when there is a text layer; `scan` when there is not. */
		text: 'searchable' | 'scan';
		has_file: boolean;
	}[];
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
