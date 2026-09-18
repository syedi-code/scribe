import { inkFor } from './authors';
import { blocksOf, localise } from './blocks';
import { untag, untagQuote } from './tags';
import { sharedRun, wordsOf } from './overlap';
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

/**
 * A citation half-written.
 *
 * Markers arrive a token at a time, so mid-stream the prose ends in `[P7 "the
 * will to` and the reader watches the machinery instead of the answer. The
 * unfinished tail is held back until its closing bracket lands, which is a
 * fraction of a second later.
 */
const HALF_WRITTEN = /\s*\[(?:P(?:\d+(?:\s*[:,]?\s*(?:["“][^"”]*)?)?)?)?$/;

export const trimHalfWrittenCitation = (text: string) =>
	text.replace(HALF_WRITTEN, '');

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
	| { kind: 'title'; text: string }
	| { kind: 'author'; text: string; ink: number }
	| { kind: 'emphasis'; text: string; strong: boolean }
	| { kind: 'code'; text: string }
	| {
			kind: 'citation';
			index: number;
			handle: string;
			/** The quotation as the reader should see it, once. */
			quote: string;
			/** The part of it the server checked, as [start, end) within `quote`. */
			checked: [number, number];
	  };

export interface Sentence {
	nodes: AnswerNode[];
	/** Whether a citation stands behind this sentence. */
	cited: boolean;
}

/**
 * A block of an answer, as the model wrote it.
 *
 * `blocksOf` decides which is which; this is what each becomes once its
 * citations, titles and names are in place.
 */
export type Block =
	| { kind: 'prose'; sentences: Sentence[] }
	| { kind: 'heading'; level: 2 | 3; sentences: Sentence[] }
	| { kind: 'quote'; sentences: Sentence[] }
	| { kind: 'code'; lang: string; text: string }
	| { kind: 'rule' }
	| {
			kind: 'list';
			ordered: boolean;
			items: { depth: 0 | 1; sentences: Sentence[] }[];
	  };

/** A citation, and which of the answer's citations it is. */
export type NumberedMarker = CitationMarker & { index: number };

/* -------------------------------------------------------------------------
   The model quotes twice.

   The instructions ask for the quotation inside the citation — `[P7 "…"]` —
   and models write the passage out in their own prose first anyway, then cite
   a few words of it. Rendering both prints the same sentence twice running,
   which is how a perfectly good answer reads as gibberish.

   So a citation that only repeats the quotation the prose has just closed is
   folded back into it: the reader sees the passage once, with the words the
   server actually checked set one weight heavier inside it. Nothing is
   dropped except the duplicate, and the stamp still reports only what was
   checked.
   ------------------------------------------------------------------------- */

/**
 * A quotation the prose has just closed before a citation, and the clause that
 * may trail it — *the "reciprocal kinship between knowledge and language" that
 * characterized Classical thought [P28 "…"]*. Requiring the quotation to sit
 * flush against the citation missed that, and printed the passage twice.
 */
const QUOTED_TAIL = /["“]([^"”]{12,})["”]([^"”]{0,80}?)[\s,;:.]*$/;

interface Absorbed {
	/** The prose to keep, with the duplicated quotation removed. */
	prose: string;
	quote: string;
	checked: [number, number];
	/** The clause that sat between the quotation and the citation, if any. */
	trailing: string;
}


/** Whether `prose` has just written out the passage this citation repeats. */
function absorbQuotation(prose: string, quote: string): Absorbed | null {
	const tail = QUOTED_TAIL.exec(prose);
	if (!tail) return null;
	const written = tail[1];

	// The citation must be the same passage, not merely a neighbouring one.
	const shared = sharedRun(wordsOf(written), wordsOf(quote));
	if (!shared) return null;

	return {
		prose: prose.slice(0, tail.index),
		quote: written,
		checked: shared,
		trailing: tail[2] ?? '',
	};
}

/** Where a sentence ends: terminal punctuation, then space, then a new start. */
const SENTENCE_END = /([.!?…]["”’)\]]*)(\s+)(?=[“"'(\p{Lu}\p{N}])/gu;

/** Not sentence ends, however much they look like them. */
const ABBREVIATION =
	/(?:^|\s)(?:pp?|cf|e\.g|i\.e|etc|vol|ed|trans|ch|sec|no|fig|St|Mr|Mrs|Ms|Dr|Prof|\p{Lu})\.$/u;

/**
 * The model writes markdown whatever the instructions say, and it nests it:
 * `**1. Al-Ghazali's *Deliverance from Error* (11th century)**`. A single pass
 * that refused an asterisk inside a bold never matched that at all -- it
 * latched onto the second `*` instead and left `**` in the prose as literal
 * text. Bold is found first, then emphasis inside whatever it holds.
 */
const BOLD = /\*\*([\s\S]+?)\*\*/g;
const ITALIC = /(?<![\p{L}\p{N}])[*_]([^*_\n]+)[*_]/gu;
/** Inline code, found first: an asterisk inside a span of code is code. */
const TICKED = /`([^`\n]+)`/g;

/**
 * The works being discussed, set as works.
 *
 * A model asked to wrap its book titles in a tag would forget, and a forgotten
 * tag shows the reader markup. The titles are already known from the citations
 * the server checked, so the prose is matched against those instead: nothing
 * is italicised that the answer did not actually cite.
 */
function setTitles(
	nodes: AnswerNode[],
	titles: readonly string[]
): AnswerNode[] {
	if (titles.length === 0) return nodes;
	const quoted = titles.map((title) =>
		title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	);
	const pattern = new RegExp(`(${quoted.join('|')})`, 'g');

	return nodes.flatMap((node): AnswerNode[] => {
		// The model italicises its own titles. That is a hint, not a claim:
		// it earns `work-title` only if it names a work the answer cited,
		// and otherwise stays the emphasis the model asked for. Without this
		// a title the model marked up was never recognised as one at all.
		if (node.kind === 'emphasis' && !node.strong) {
			return names(node.text, titles)
				? [{ kind: 'title', text: node.text }]
				: [node];
		}
		if (node.kind !== 'text') return [node];
		return node.text
			.split(pattern)
			.filter((piece) => piece !== '')
			.map((piece) =>
				titles.includes(piece)
					? { kind: 'title', text: piece }
					: { kind: 'text', text: piece }
			);
	});
}

/**
 * Whether an emphasised run names a cited work. A model shortens a title it
 * has already given in full -- `Meditations` for `Meditations on First
 * Philosophy` -- so a leading run of it counts, but nothing shorter than a
 * word or two, which would catch `The` or `On`.
 */
function names(text: string, titles: readonly string[]): boolean {
	const written = text.trim().toLowerCase();
	if (written.length < 4) return false;
	return titles.some((title) => {
		const whole = title.toLowerCase();
		return whole === written || whole.startsWith(written + ' ');
	});
}

/**
 * The people being discussed, written in their own ink.
 *
 * Same discipline as the titles: the surnames come from the creators of
 * works the server actually checked, so nothing is inked that the answer did
 * not cite. Only whole words match, so `Kantian` stays prose while `Kant`
 * does not, and a surname inside a work's title is left to the title.
 */
function setAuthors(
	nodes: AnswerNode[],
	surnames: readonly string[]
): AnswerNode[] {
	if (surnames.length === 0) return nodes;
	const quoted = surnames.map((name) =>
		name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	);
	const pattern = new RegExp(
		`(?<![\\p{L}])(${quoted.join('|')})(?![\\p{L}])`,
		'gu'
	);

	return nodes.flatMap((node): AnswerNode[] => {
		if (node.kind !== 'text') return [node];
		return node.text
			.split(pattern)
			.filter((piece) => piece !== '')
			.map((piece) =>
				surnames.includes(piece)
					? { kind: 'author', text: piece, ink: inkFor(piece) }
					: { kind: 'text', text: piece }
			);
	});
}

const plain = (text: string, strong: boolean): AnswerNode =>
	strong ? { kind: 'emphasis', text, strong: true } : { kind: 'text', text };

/** Emphasis inside a run that is already bold, or inside one that is not. */
function italicise(text: string, strong: boolean): AnswerNode[] {
	const nodes: AnswerNode[] = [];
	let cursor = 0;
	for (const match of text.matchAll(ITALIC)) {
		if (match.index > cursor) {
			nodes.push(plain(text.slice(cursor, match.index), strong));
		}
		nodes.push({ kind: 'emphasis', text: match[1], strong: false });
		cursor = match.index + match[0].length;
	}
	if (cursor < text.length) nodes.push(plain(text.slice(cursor), strong));
	return nodes;
}

function emphasise(text: string): AnswerNode[] {
	const nodes: AnswerNode[] = [];
	let cursor = 0;
	for (const match of text.matchAll(TICKED)) {
		if (match.index > cursor) {
			nodes.push(...bolden(text.slice(cursor, match.index)));
		}
		nodes.push({ kind: 'code', text: match[1] });
		cursor = match.index + match[0].length;
	}
	if (cursor < text.length) nodes.push(...bolden(text.slice(cursor)));
	return nodes;
}

function bolden(text: string): AnswerNode[] {
	const nodes: AnswerNode[] = [];
	let cursor = 0;
	for (const match of text.matchAll(BOLD)) {
		if (match.index > cursor) {
			nodes.push(...italicise(text.slice(cursor, match.index), false));
		}
		nodes.push(...italicise(match[1], true));
		cursor = match.index + match[0].length;
	}
	if (cursor < text.length) {
		nodes.push(...italicise(text.slice(cursor), false));
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

/** The inline passes, in the order each earns its claim over the last. */
function inline(
	piece: string,
	titles: readonly string[],
	surnames: readonly string[]
): AnswerNode[] {
	// What the model marked comes first and is never reconsidered; the
	// catalogue only ever runs on what is left over as plain text.
	const marked = untag(piece);
	const emphasised = marked.flatMap((node): AnswerNode[] =>
		node.kind === 'text' ? emphasise(node.text) : [node]
	);
	return setAuthors(setTitles(emphasised, titles), surnames);
}

/**
 * One block's sentences, with each citation standing in place of the marker
 * that produced it.
 *
 * Sentences are the unit because `Only what's cited` works on them: a sentence
 * with no citation behind it is a sentence the answer is standing on by
 * itself, and the reader is entitled to see which those are.
 */
function sentencesOf(
	text: string,
	markers: readonly NumberedMarker[],
	titles: readonly string[],
	surnames: readonly string[]
): Sentence[] {
	const sentences: Sentence[] = [];
	let nodes: AnswerNode[] = [];
	let cited = false;

	const closeSentence = () => {
		if (nodes.length === 0) return;
		sentences.push({ nodes, cited });
		nodes = [];
		cited = false;
	};

	/**
	 * A citation is where a sentence usually ends — *“…the value of this
	 * will.” That is my reading of it* is two sentences, and dimming the
	 * second of them is the entire point of `Only what's cited`.
	 */
	const breaksAfterCitation = /^(\s+)(?=[“"'(\p{Lu}\p{N}])/u;

	const addProse = (prose: string) => {
		// Inside a block a single newline is only the width of the column.
		const flat = prose.replace(/\s*\n\s*/g, ' ');
		sentencePieces(flat).forEach((piece, at, pieces) => {
			nodes.push(...inline(piece, titles, surnames));
			// Every piece but the last ends a sentence; the last may be
			// continued by a citation or by the next chunk of prose.
			if (at < pieces.length - 1) closeSentence();
		});
	};

	/** Prose that follows a citation, which may be a new sentence. */
	const addAfter = (prose: string) => {
		const split =
			nodes[nodes.length - 1]?.kind === 'citation' &&
			breaksAfterCitation.exec(prose);
		if (!split) return addProse(prose);
		nodes.push({ kind: 'text', text: split[1] });
		closeSentence();
		addProse(prose.slice(split[1].length));
	};

	let cursor = 0;
	for (const marker of markers) {
		const before = text.slice(cursor, marker.start);
		const quote = untagQuote(marker.quote);
		const absorbed = absorbQuotation(before, quote);
		addAfter(absorbed ? absorbed.prose : before);
		nodes.push({
			kind: 'citation',
			index: marker.index,
			handle: marker.handle,
			quote: absorbed ? absorbed.quote : quote,
			checked: absorbed ? absorbed.checked : [0, quote.length],
		});
		cited = true;
		if (absorbed?.trailing) addAfter(absorbed.trailing);
		cursor = marker.end;
	}

	addAfter(text.slice(cursor));
	closeSentence();

	return sentences;
}

/**
 * An answer, as the blocks it was written in.
 *
 * The block layer comes first and the inline passes run inside each one, so a
 * citation never has to survive being cut in half by a list marker. Every
 * citation keeps the index it has in the answer, so the stamp a reader clicks
 * is the citation the server checked, whatever block it ended up in.
 */
export function segmentAnswer(
	text: string,
	markers: CitationMarker[],
	/** Work titles to set, whether this answer cited them or the library holds them. */
	titles: readonly string[] = [],
	/** Surnames to ink, from the same two places. */
	surnames: readonly string[] = []
): Block[] {
	const numbered: NumberedMarker[] = markers.map((marker, index) => ({
		...marker,
		index,
	}));
	const raw = blocksOf(text);
	const blocks: Block[] = [];

	for (let at = 0; at < raw.length; at++) {
		const block = raw[at];

		if (block.kind === 'rule') {
			blocks.push({ kind: 'rule' });
			continue;
		}

		if (block.kind === 'code') {
			blocks.push({
				kind: 'code',
				lang: block.lang,
				text: localise(text, block.spans, []).text,
			});
			continue;
		}

		// Items that run together are one list, so the numbering is the
		// list's rather than each line's.
		if (block.kind === 'item') {
			const { ordered } = block;
			const items: { depth: 0 | 1; sentences: Sentence[] }[] = [];
			let next = raw[at];
			while (next?.kind === 'item' && next.ordered === ordered) {
				const one = localise(text, next.spans, numbered);
				items.push({
					depth: next.depth,
					sentences: sentencesOf(
						one.text,
						one.markers,
						titles,
						surnames
					),
				});
				next = raw[++at];
			}
			at--;
			if (items.some((item) => item.sentences.length > 0)) {
				blocks.push({ kind: 'list', ordered, items });
			}
			continue;
		}

		const one = localise(text, block.spans, numbered);
		const sentences = sentencesOf(
			one.text,
			one.markers,
			titles,
			surnames
		);
		if (sentences.length === 0) continue;

		blocks.push(
			block.kind === 'heading'
				? { kind: 'heading', level: block.level, sentences }
				: { kind: block.kind, sentences }
		);
	}

	return blocks;
}
