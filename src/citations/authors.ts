/**
 * An author's surname, and the ink it is written in.
 *
 * Creators arrive from alexandria as free text. The library holds, among
 * others: `G. W. Leibniz`, `Martin Luther King Jr.`, `Malcolm X`, `Plato`,
 * `Ibn 'Arabī`, `Aimé Césaire`, `Max Horkheimer & Theodor W. Adorno` and
 * `Griffin; Ledbetter; Sparks`. Each is split into one or more authors, and
 * each author into what comes before the surname, the surname, and whatever
 * trails it.
 *
 * Only the surname is inked. A first name or an initial is not what a reader
 * is scanning for, and colouring `G. W.` alongside `Leibniz` would make the
 * line busier without making it easier to read.
 *
 * The approach is stylus's `lib/bookAttribution.ts`; the palette is not.
 * Stylus paints chrome on a near-black ground and can afford bright hues.
 * These are words inside prose on cream, so the inks sit at the prose's own
 * lightness and are separated from the three verdict inks by a whole
 * lightness band — see `--author-c0…5` in `styles/theme.css`.
 */

/** How many inks the palette holds. Match `--author-cN` in the stylesheet. */
export const AUTHOR_INKS = 6;

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'phd', 'md', 'esq']);

/**
 * A surname has to be long enough to be a word. `Malcolm X` is in the library,
 * and a bare `X` would ink every algebraic aside in an answer.
 */
const SHORTEST_SURNAME = 3;

export interface InkedPiece {
	text: string;
	/** The ink slot, or -1 for a piece that is not a surname. */
	ink: number;
}

export interface SlicedName {
	/** What comes before the surname, with a trailing space. `G. W. ` */
	firstParts: string;
	/** The surname, or the whole of a mononym. */
	lastName: string;
	/** What trails the surname, with a leading space. ` Jr.` */
	suffix: string;
}

/**
 * One creator string may name several people. The library uses all three
 * separators, sometimes together — `Griffin; Ledbetter; Sparks`,
 * `Max Horkheimer & Theodor W. Adorno`, `Vidal, Smith, Rotta & Prew`.
 *
 * A comma counts as a separator here because nothing in this catalogue is
 * written surname-first; if `Smith, John` ever arrives it will be read as two
 * people, and that is the trade this library's data is worth.
 */
export function splitAuthors(raw: string): string[] {
	if (!raw) return [];
	return raw
		.split(/\s*;\s*|\s+&\s+|\s*,\s*/)
		.map((part) => part.trim())
		.filter(Boolean);
}

export function sliceName(author: string): SlicedName {
	const trimmed = author.trim();
	if (!trimmed) return { firstParts: '', lastName: '', suffix: '' };

	const tokens = trimmed.split(/\s+/);
	if (tokens.length === 1) {
		return { firstParts: '', lastName: tokens[0], suffix: '' };
	}

	let last = tokens.length - 1;
	while (
		last > 0 &&
		SUFFIXES.has(tokens[last].toLowerCase().replace(/[.,]$/, ''))
	) {
		last--;
	}

	return {
		firstParts: last === 0 ? '' : tokens.slice(0, last).join(' ') + ' ',
		lastName: tokens[last],
		suffix:
			last === tokens.length - 1
				? ''
				: ' ' + tokens.slice(last + 1).join(' '),
	};
}

/**
 * Apostrophes reach us straight, curled and as the modifier letter used in
 * transliteration — `Ibn 'Arabī`, `Ibn ’Arabī`, `Ibn ʼArabī`. They have to
 * hash alike, or one person is written in two inks depending on where the
 * name was typed.
 */
const APOSTROPHES = /[‘’ʼ`]/g;

/** FNV-1a, 32-bit: small, fast, deterministic, and no dependency. */
function hash(text: string): number {
	let value = 0x811c9dc5;
	for (let at = 0; at < text.length; at++) {
		value ^= text.charCodeAt(at);
		value = Math.imul(value, 0x01000193);
	}
	return value >>> 0;
}

/** The ink a surname is always written in, or -1 when there is no name. */
export function inkFor(surname: string): number {
	const key = surname.trim().toLowerCase().replace(APOSTROPHES, "'");
	return key ? hash(key) % AUTHOR_INKS : -1;
}

/**
 * The surnames worth looking for in an answer's prose: every creator the
 * answer actually cited, longest first so `de Beauvoir` is matched before
 * `Beauvoir` would be.
 */
export const inkClass = (ink: number) =>
	ink < 0 ? '' : `author-c${ink % AUTHOR_INKS}`;

export function surnamesOf(creators: readonly string[]): string[] {
	const found = new Set<string>();
	for (const creator of creators) {
		for (const author of splitAuthors(creator)) {
			const { lastName } = sliceName(author);
			if (lastName.length >= SHORTEST_SURNAME) found.add(lastName);
		}
	}
	return [...found].sort((a, b) => b.length - a.length);
}

/**
 * A creator string cut into plain pieces and inked surnames, with its own
 * punctuation left exactly as alexandria sent it — `Griffin; Ledbetter;
 * Sparks` keeps its semicolons rather than being rejoined with ampersands.
 *
 * Every surname is inked here, including a one-letter one: `Malcolm X` is an
 * attribution, not prose, so there is nothing for a bare `X` to collide with.
 */
export function inkedName(creator: string): InkedPiece[] {
	const surnames = splitAuthors(creator)
		.map((author) => sliceName(author).lastName)
		.filter(Boolean)
		.sort((a, b) => b.length - a.length);
	if (surnames.length === 0) return [{ text: creator, ink: -1 }];

	const quoted = surnames.map((name) =>
		name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	);
	const pattern = new RegExp(
		`(?<![\\p{L}])(${quoted.join('|')})(?![\\p{L}])`,
		'gu'
	);

	return creator
		.split(pattern)
		.filter((piece) => piece !== '')
		.map((piece) => ({
			text: piece,
			ink: surnames.includes(piece) ? inkFor(piece) : -1,
		}));
}
