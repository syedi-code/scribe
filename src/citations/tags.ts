import { inkFor } from './authors';
import type { AnswerNode } from './parse';

/**
 * The names and titles the model marked for us.
 *
 * `CLAUDE.md` used to forbid this: a model asked to tag its titles forgets,
 * and a forgotten tag shows the reader markup. Both halves of that are true
 * and neither is fatal. It forgets *sometimes*, so the catalogue still runs
 * behind it as a fallback; and markup only reaches the reader if we print it,
 * so an unclosed tag is swept instead.
 *
 * It buys the thing no rule of ours could: the model knows Newton is a person
 * and Sufism is not. Every heuristic for that is a list of words to be wrong
 * about.
 */

/**
 * Closed properly, or closed with a bare `>`: production has
 * `<author>Plato>’s`, and the reader was shown `Plato>’s`.
 */
const TAGGED = /<(title|author)>([^<>]*?)(?:<\/\1>|>)/g;

/**
 * A tag opened and not closed, or closed and never opened. Mid-stream the
 * first happens constantly — the closer is a few tokens behind — and at the
 * end of an answer it means the model lost its place. Either way the reader
 * sees the words, never the brackets.
 */
const STRAY = /<\/?(?:title|author)>/g;

export const stripTags = (text: string) => text.replace(STRAY, '');

/**
 * A quote is matched against its page character for character, so a tag
 * inside one turns a faithful citation into an unverified one. The model is
 * asked not to; this is what happens when it does anyway.
 */
export const untagQuote = stripTags;

/** Splits on what the model marked, leaving everything else to later passes. */
export function untag(text: string): AnswerNode[] {
	const nodes: AnswerNode[] = [];
	let cursor = 0;

	for (const match of text.matchAll(TAGGED)) {
		if (match.index > cursor) {
			nodes.push({
				kind: 'text',
				text: stripTags(text.slice(cursor, match.index)),
			});
		}
		const inner = stripTags(match[2]).trim();
		const spaced = match[2].length - match[2].trimStart().length;
		if (spaced > 0) nodes.push({ kind: 'text', text: ' ' });
		if (inner) {
			nodes.push(
				match[1] === 'title'
					? { kind: 'title', text: inner }
					: { kind: 'author', text: inner, ink: inkFor(inner) }
			);
		}
		if (match[2].trimEnd().length < match[2].length) {
			nodes.push({ kind: 'text', text: ' ' });
		}
		cursor = match.index + match[0].length;
	}

	if (cursor < text.length) {
		nodes.push({ kind: 'text', text: stripTags(text.slice(cursor)) });
	}

	return nodes.filter((node) => node.kind !== 'text' || node.text !== '');
}
