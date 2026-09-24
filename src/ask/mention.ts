import type { Work } from '../api/types';

/**
 * Naming a book by typing `@` (#51), the way a file is named in an editor.
 *
 * What is inserted is the title, as words. A question is text end to end —
 * alexandria reads it, the model reads it, the rail names the conversation
 * from it — so a mention that became anything else would be a second kind of
 * question with nowhere to go. The menu is a way to spell a title right, and
 * to find out that the library holds it, without leaving the composer.
 */

/** A mention being typed: where its `@` is, and what follows it up to the caret. */
export interface Mention {
	start: number;
	query: string;
}

/** Longer than any title is worth typing; past it the `@` was something else. */
const LONGEST = 48;

/** How many works the menu offers at once. */
export const MENTION_LIMIT = 6;

/**
 * The mention the caret is in, or null. An `@` counts only at the start of a
 * word, so `someone@example.org` is left alone, and a mention ends at a line
 * break or where its first character is a space.
 */
export function mentionAt(text: string, caret: number): Mention | null {
	const before = text.slice(0, caret);
	const start = before.lastIndexOf('@');
	if (start < 0) return null;
	if (start > 0 && !/\s/.test(before[start - 1])) return null;
	const query = before.slice(start + 1);
	if (query.length > LONGEST || query.includes('\n') || /^\s/.test(query))
		return null;
	return { start, query };
}

/** Case, accents and apostrophes aside: `@nietz` finds Nietzsche, `@arabi` Ibn ’Arabī. */
const fold = (text: string) =>
	text
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/[‘’ʼ'`]/g, '')
		.toLowerCase();

const startsAWord = (text: string, word: string) =>
	text.split(/[\s\-–—:,.]+/).some((piece) => piece.startsWith(word));

/**
 * The works a query could mean, best first: a title that begins with it, then
 * a title with a word that does, then an author who does. Every word typed
 * must begin a word of the title or the author — `@kant pure` is Kant's
 * *Critique of Pure Reason*, and `@ni` is Nietzsche, not *Discipline and
 * Punish* for the letters inside *punish*.
 */
export function worksFor(
	works: readonly Work[],
	query: string,
	limit = MENTION_LIMIT
): Work[] {
	const words = fold(query).split(/\s+/).filter(Boolean);
	const whole = words.join(' ');

	return works
		.map((work) => {
			const title = fold(work.title);
			const creator = fold(work.creator);
			const held = `${title} ${creator}`;
			if (!words.every((word) => startsAWord(held, word))) return null;
			const rank =
				!whole || title.startsWith(whole)
					? 0
					: startsAWord(title, words[0])
						? 1
						: 2;
			return { work, rank };
		})
		.filter((found) => found !== null)
		.sort(
			(a, b) =>
				a.rank - b.rank || a.work.title.localeCompare(b.work.title)
		)
		.slice(0, limit)
		.map(({ work }) => work);
}

/** The draft with the mention replaced by the title, and where the caret goes. */
export function insertMention(
	text: string,
	mention: Mention,
	caret: number,
	title: string
): { text: string; caret: number } {
	const after = text.slice(caret);
	const spaced = /^\s/.test(after) ? '' : ' ';
	return {
		text: text.slice(0, mention.start) + title + spaced + after,
		// Past the space either way, ready for the next word.
		caret: mention.start + title.length + 1,
	};
}
