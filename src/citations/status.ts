import { COPY } from '../copy';
import type { AnswerCitation, CitationReason } from '../api/types';

/**
 * One status map. Verdict wording, stamp shape, rule colour and verdict colour
 * all come from here, keyed by what the server actually reported.
 *
 * A colour or a shape written inline in a component is a bug: the next status
 * would be added in four places and shown in three. Note that the shape is
 * never redundant with the colour — filled, open and dotted each say the
 * verdict on their own, so the stamp survives being printed, and a reader who
 * cannot tell rubric from verdigris still reads it correctly.
 */

export type VerdictKey = 'pending' | 'verified' | CitationReason;

export interface StatusPresentation {
	/** What the reader is told, in words. Never a bare “verified”. */
	verdict: string;
	/** The pip that stands for this citation on the shelf. */
	stamp: string;
	/**
	 * The rule under the quoted words in the prose. Style as well as colour:
	 * solid, wavy and dotted each say the verdict on their own, so it survives
	 * being printed and a reader who cannot tell rubric from verdigris still
	 * reads it correctly.
	 */
	underline: string;
	/** The rule down the left of the margin note. */
	rule: string;
	/** The verdict line in the note. */
	ink: string;
}

const FOUND = 'border-verdigris bg-verdigris';
const NOT_FOUND = 'border-rubric';
const UNCHECKABLE = 'border-slate border-dotted';

/**
 * Thin, and set well clear of the descenders. A quotation runs to twenty
 * words and the rule under it is a footnote about those words, not a second
 * voice in the sentence.
 */
const RULE = 'underline decoration-1 underline-offset-[0.18em]';
const RULE_FOUND = `${RULE} decoration-verdigris`;
const RULE_NOT_FOUND = `${RULE} decoration-rubric decoration-wavy`;
const RULE_UNCHECKABLE = `${RULE} decoration-slate decoration-dotted`;
const RULE_PENDING = `${RULE} decoration-ink-faint decoration-dotted`;

export const CITATION_STATUS: Record<VerdictKey, StatusPresentation> = {
	pending: {
		verdict: COPY.verdict.pending,
		stamp: 'border-ink-faint animate-breathe',
		underline: RULE_PENDING,
		rule: 'border-l-paper-deep',
		ink: 'text-ink-soft',
	},
	verified: {
		verdict: COPY.verdict.verified,
		stamp: FOUND,
		underline: RULE_FOUND,
		rule: 'border-l-verdigris',
		ink: 'text-verdigris',
	},
	not_found: {
		verdict: COPY.verdict.not_found,
		stamp: NOT_FOUND,
		underline: RULE_NOT_FOUND,
		rule: 'border-l-rubric',
		ink: 'text-rubric',
	},
	partial_match: {
		verdict: COPY.verdict.partial_match,
		stamp: NOT_FOUND,
		underline: RULE_NOT_FOUND,
		rule: 'border-l-rubric',
		ink: 'text-rubric',
	},
	quote_too_short: {
		verdict: COPY.verdict.quote_too_short,
		stamp: NOT_FOUND,
		underline: RULE_NOT_FOUND,
		rule: 'border-l-rubric',
		ink: 'text-rubric',
	},
	no_such_page: {
		verdict: COPY.verdict.no_such_page,
		stamp: NOT_FOUND,
		underline: RULE_NOT_FOUND,
		rule: 'border-l-rubric',
		ink: 'text-rubric',
	},
	unknown_handle: {
		verdict: COPY.verdict.unknown_handle,
		stamp: NOT_FOUND,
		underline: RULE_NOT_FOUND,
		rule: 'border-l-rubric',
		ink: 'text-rubric',
	},
	no_text_layer: {
		verdict: COPY.verdict.no_text_layer,
		stamp: UNCHECKABLE,
		underline: RULE_UNCHECKABLE,
		rule: 'border-l-slate',
		ink: 'text-slate',
	},
};

/** A citation that has not been checked yet is not a status — it is the absence of one. */
export const verdictKey = (citation: AnswerCitation | null): VerdictKey =>
	citation === null
		? 'pending'
		: citation.status === 'verified'
			? 'verified'
			: citation.reason;

export const presentationOf = (citation: AnswerCitation | null) =>
	CITATION_STATUS[verdictKey(citation)];
