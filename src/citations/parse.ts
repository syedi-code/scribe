import type { AnswerCitation } from '../api/types';

/**
 * Finding a citation in the text of an answer.
 *
 * This regex mirrors `parseCitations()` in alexandria's
 * `conversations/citations.ts`, and the two have to agree forever — including
 * on curly quotes, `[P7: "…"]`, and quotes that contain quotes. When they
 * drift, an answer renders with a citation the reader can see in the margin
 * and cannot find in the prose.
 *
 * So it lives here, once, with a test file of the awkward cases beside it, and
 * nothing else in the app looks for a citation. The proper fix is for the
 * server to send marker offsets — `plans/scribe-citations-api.md`, change 3 —
 * and `markersFor()` below prefers them the day they arrive.
 */
const CITATION =
	/\[(P\d+)\s*[:,]?\s*["“](.+?)["”]\s*\]|["“]([^"”]+)["”]\s*\[(P\d+)\]/g;

export interface CitationMarker {
	handle: string;
	quote: string;
	/** Offsets into the answer text, so the words can be replaced in place. */
	start: number;
	end: number;
}

export function parseCitations(text: string): CitationMarker[] {
	return [...text.matchAll(CITATION)].map((match) => {
		const [whole, handle, quote, quoteBefore, handleAfter] = match;
		return {
			handle: handle ?? handleAfter,
			quote: (quote ?? quoteBefore).trim(),
			start: match.index,
			end: match.index + whole.length,
		};
	});
}

/** Loose identity, for pairing one parse of a quote with another parse of it. */
const sameQuote = (a: string, b: string) =>
	a
		.replace(/[“”"'’]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase() ===
	b
		.replace(/[“”"'’]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();

/**
 * Pairs the citations the server checked with the markers in the answer.
 *
 * The server verifies every step's text, not only the last, so a model that
 * quoted while narrating produces citations with no marker in the answer. They
 * are paired by handle and quote rather than by position, and a marker with no
 * citation stays `null` — pending, or never checked, but never guessed at.
 */
export function alignCitations(
	markers: CitationMarker[],
	citations: AnswerCitation[] | undefined
): (AnswerCitation | null)[] {
	if (!citations?.length) return markers.map(() => null);
	const unclaimed = [...citations];
	const take = (index: number) => unclaimed.splice(index, 1)[0];

	return markers.map((marker) => {
		const exact = unclaimed.findIndex(
			(citation) =>
				citation.handle === marker.handle &&
				sameQuote(citation.quote, marker.quote)
		);
		if (exact >= 0) return take(exact);
		const byHandle = unclaimed.findIndex(
			(citation) => citation.handle === marker.handle
		);
		return byHandle >= 0 ? take(byHandle) : null;
	});
}

/** The server's own offsets when it sends them; this module's parse until then. */
export function markersFor(
	text: string,
	citations: AnswerCitation[] | undefined
): CitationMarker[] {
	const withOffsets = citations?.filter((citation) => citation.marker);
	if (citations?.length && withOffsets?.length === citations.length) {
		return citations.map((citation) => ({
			handle: citation.handle,
			quote: citation.quote,
			start: citation.marker!.start,
			end: citation.marker!.end,
		}));
	}
	return parseCitations(text);
}

/* -------------------------------------------------------------------------
   An answer, cut into what it is made of.

   The model is instructed to write plain prose, so the renderer supports
   paragraphs, emphasis and citations, and nothing else. A heading in an
   answer is a decision, not a default.
   ------------------------------------------------------------------------- */

export type AnswerNode =
	| { kind: 'text'; text: string }
	| { kind: 'emphasis'; text: string; strong: boolean }
	| { kind: 'citation'; index: number; handle: string; quote: string };

export interface Sentence {
	nodes: AnswerNode[];
	/** Whether a citation stands behind this sentence. */
	cited: boolean;
}

export type Paragraph = Sentence[];

/** Where a sentence ends: terminal punctuation, then space, then a new start. */
const SENTENCE_END = /([.!?…]["”’)\]]*)(\s+)(?=[“"'(\p{Lu}\p{N}])/gu;

/** Not sentence ends, however much they look like them. */
const ABBREVIATION =
	/(?:^|\s)(?:pp?|cf|e\.g|i\.e|etc|vol|ed|trans|ch|sec|no|fig|St|Mr|Mrs|Ms|Dr|Prof|\p{Lu})\.$/u;

const EMPHASIS = /\*\*([^*]+)\*\*|(?<![\p{L}\p{N}])[*_]([^*_\n]+)[*_]/gu;

function emphasise(text: string): AnswerNode[] {
	const nodes: AnswerNode[] = [];
	let cursor = 0;
	for (const match of text.matchAll(EMPHASIS)) {
		if (match.index > cursor) {
			nodes.push({ kind: 'text', text: text.slice(cursor, match.index) });
		}
		nodes.push({
			kind: 'emphasis',
			text: match[1] ?? match[2],
			strong: match[1] !== undefined,
		});
		cursor = match.index + match[0].length;
	}
	if (cursor < text.length) {
		nodes.push({ kind: 'text', text: text.slice(cursor) });
	}
	return nodes;
}

/** Splits prose into sentences, keeping the whitespace that followed each one. */
function sentencePieces(text: string): string[] {
	const pieces: string[] = [];
	let start = 0;
	for (const match of text.matchAll(SENTENCE_END)) {
		const end = match.index + match[1].length + match[2].length;
		const piece = text.slice(start, end);
		if (ABBREVIATION.test(text.slice(start, match.index + match[1].length)))
			continue;
		pieces.push(piece);
		start = end;
	}
	if (start < text.length) pieces.push(text.slice(start));
	return pieces;
}

/**
 * The answer as paragraphs of sentences, with each citation standing in place
 * of the marker that produced it.
 *
 * Sentences are the unit because `Only what's cited` works on them: a sentence
 * with no citation behind it is a sentence the answer is standing on by
 * itself, and the reader is entitled to see which those are.
 */
export function segmentAnswer(
	text: string,
	markers: CitationMarker[]
): Paragraph[] {
	const paragraphs: Paragraph[] = [];
	let sentences: Paragraph = [];
	let nodes: AnswerNode[] = [];
	let cited = false;

	const closeSentence = () => {
		if (nodes.length === 0) return;
		sentences.push({ nodes, cited });
		nodes = [];
		cited = false;
	};
	const closeParagraph = () => {
		closeSentence();
		if (sentences.length > 0) paragraphs.push(sentences);
		sentences = [];
	};

	/**
	 * A citation is where a sentence usually ends — *“…the value of this
	 * will.” That is my reading of it* is two sentences, and dimming the
	 * second of them is the entire point of `Only what's cited`.
	 */
	const breaksAfterCitation = /^(\s+)(?=[“"'(\p{Lu}\p{N}])/u;

	const addProse = (prose: string) => {
		// A blank line is a paragraph break; a single newline is just a space.
		const blocks = prose.split(/\n{2,}/);
		blocks.forEach((block, index) => {
			if (index > 0) closeParagraph();
			const flat = block.replace(/\s*\n\s*/g, ' ');
			const pieces = sentencePieces(flat);
			pieces.forEach((piece, at) => {
				nodes.push(...emphasise(piece));
				// Every piece but the last ends a sentence; the last may be
				// continued by a citation or by the next chunk of prose.
				if (at < pieces.length - 1) closeSentence();
			});
		});
	};

	/** Prose that follows a citation, which may be a new sentence. */
	const addAfter = (prose: string) => {
		// A blank line is a paragraph break and belongs to addProse; anything
		// shorter is the space between two sentences.
		const split =
			nodes[nodes.length - 1]?.kind === 'citation' &&
			!/^[^\S\n]*\n[^\S\n]*\n/.test(prose) &&
			breaksAfterCitation.exec(prose);
		if (!split) return addProse(prose);
		nodes.push({ kind: 'text', text: split[1] });
		closeSentence();
		addProse(prose.slice(split[1].length));
	};

	let cursor = 0;
	markers.forEach((marker, index) => {
		addAfter(text.slice(cursor, marker.start));
		nodes.push({
			kind: 'citation',
			index,
			handle: marker.handle,
			quote: marker.quote,
		});
		cited = true;
		cursor = marker.end;
	});

	addAfter(text.slice(cursor));
	closeParagraph();

	return paragraphs;
}
