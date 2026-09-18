import { sharedRun, wordsOf } from './overlap';
import type { QuoteContext } from '../api/types';

/**
 * The quote found on the page it names, with just enough either side to read.
 *
 * The server is meant to send this window with the citation
 * (`plans/scribe-citations-api.md`, change 2) and does not, so every citation
 * fell through to the branch that printed the entire page — several hundred
 * words, under three stacked explanations of why. The page text is already
 * here and so is the quote; finding one in the other is what the drawer
 * needed all along.
 *
 * Matched on a run of words rather than on the characters, because these
 * pages are scanned: a quote copied faithfully still misses by a letter in
 * the middle often enough that an exact search is the wrong tool.
 */

/** Words either side of the quote. Enough to place it, not enough to be a page. */
const AROUND = 240;

export function findQuote(text: string, quote: string): QuoteContext | null {
	const span = sharedRun(wordsOf(text), wordsOf(quote));
	if (!span) return null;

	const [at, end] = span;
	return {
		before: opening(text.slice(Math.max(0, at - AROUND), at)),
		text: text.slice(at, end),
		after: closing(text.slice(end, end + AROUND)),
	};
}

/** Trimmed back to a word boundary, so a window never opens mid-word. */
const opening = (text: string) =>
	text.length < AROUND ? text : text.slice(text.search(/\s/) + 1);

const closing = (text: string) =>
	text.length < AROUND ? text : text.slice(0, text.lastIndexOf(' '));
