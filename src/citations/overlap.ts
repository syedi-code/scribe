/**
 * How much two passages have to share to be the same passage.
 *
 * Used to find a quote on the page it names, which has to survive a scanning
 * error in the middle of the passage, so it cannot ask for an exact match.
 */

/** Folds the characters a PDF and a model disagree about, without moving any. */
export const align = (text: string) =>
	text
		.toLowerCase()
		.replace(/[“”]/g, '"')
		.replace(/[‘’]/g, "'")
		.replace(/[–—]/g, '-');

export interface Word {
	text: string;
	at: number;
	end: number;
}

/**
 * The words of a passage and where each one sits in it. `align` swaps single
 * characters for single characters, so an offset into the folded text is an
 * offset into the original.
 */
export function wordsOf(text: string): Word[] {
	const found: Word[] = [];
	for (const match of align(text).matchAll(/[\p{L}\p{N}]+/gu)) {
		found.push({
			text: match[0],
			at: match.index,
			end: match.index + match[0].length,
		});
	}
	return found;
}

/**
 * The longest run of words two passages share, as a span of the first.
 *
 * Containment was the only case handled, and in production it is the rarest:
 * a model quotes a fragment of the passage in its prose and then cites a
 * longer one, so the two overlap without either holding the other. A run is a
 * run whichever way it is nested.
 */
export function sharedRun(
	written: Word[],
	quote: Word[],
	least = SHARED_WORDS
): [number, number] | null {
	let best = 0;
	let span: [number, number] | null = null;
	const row = new Array<number>(quote.length + 1).fill(0);

	for (let i = 1; i <= written.length; i++) {
		let diagonal = 0;
		for (let j = 1; j <= quote.length; j++) {
			const above = row[j];
			row[j] = written[i - 1].text === quote[j - 1].text ? diagonal + 1 : 0;
			if (row[j] > best) {
				best = row[j];
				span = [written[i - row[j]].at, written[i - 1].end];
			}
			diagonal = above;
		}
	}

	return best >= least ? span : null;
}

/**
 * How much overlap makes two passages the same passage. Five words is what
 * alexandria asks a citation to quote at minimum, so it is the shortest run
 * that can be a quotation rather than a coincidence of common words.
 */
const SHARED_WORDS = 5;
