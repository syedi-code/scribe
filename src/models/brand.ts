/**
 * The maker's name inside a model's name, in the maker's own colour.
 *
 * Every other name in this app is inked by hashing it, which is right for
 * authors: a collision there is harmless, because the ink links mentions and
 * never claims to identify anyone. It is wrong here. `gpt` and `gemini` both
 * hash to slot 0, and those two sit two rows apart in one short list, where
 * an accidental match reads as a mistake rather than a coincidence. Three
 * fixed names get three assigned colours.
 *
 * The colours are the makers' own, already in the stylesheet, and this is the
 * one place they are used. Nothing here reaches the reading surface: the
 * model does not talk about itself, so a brand colour never appears in an
 * answer next to an author's ink.
 */

const BRANDS: Record<string, string> = {
	Claude: 'text-anthropic',
	GPT: 'text-openai',
	Gemini: 'text-google',
};

export interface BrandedPiece {
	text: string;
	/** The Tailwind class for the maker's colour, or '' for ordinary text. */
	ink: string;
}

/**
 * A model's label split into the maker's name and the rest.
 *
 * The maker takes its generation with it, but only the whole number of it:
 * `GPT-5` is inked and `.6` is left grey. The major is the name of the
 * generation and belongs to the maker; the minor is a release and belongs to
 * the release. A number that belongs to something else stays grey entirely —
 * in `Claude Haiku 4.5` the 4.5 is Haiku's.
 *
 * The name cannot be found by the rule that finds a surname: `Claude Opus 5`
 * and `Gemini 3.5 Flash` would give up `5` and `Flash`.
 */
export function brandedLabel(label: string): BrandedPiece[] {
	const names = Object.keys(BRANDS).sort((a, b) => b.length - a.length);
	const pattern = new RegExp(`(${names.join('|')})([- ][0-9]+)?`, 'g');

	const pieces: BrandedPiece[] = [];
	let at = 0;

	for (const match of label.matchAll(pattern)) {
		if (match.index > at)
			pieces.push({ text: label.slice(at, match.index), ink: '' });
		pieces.push({ text: match[0], ink: BRANDS[match[1]] });
		at = match.index + match[0].length;
	}
	if (at < label.length) pieces.push({ text: label.slice(at), ink: '' });

	return pieces;
}
