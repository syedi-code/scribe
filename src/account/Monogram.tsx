import { monogramOf } from './useAccount';

/**
 * The reader's initial, stamped: a disc of ink with the letter reversed out
 * of it, in the bold italic the wordmark's *-lm* is cut in — a bookplate
 * rather than a web app's avatar, and the one mark in the header that is the
 * reader's own.
 *
 * Ink and paper, never a colour. Colour in this app is a verdict on a mark or
 * a name on a word, and an avatar hashed to a hue would be a third meaning
 * sitting right beside the author inks.
 */
export function Monogram({
	email,
	large = false,
}: {
	email: string;
	/** At the head of the open menu, where it introduces the address. */
	large?: boolean;
}) {
	return (
		<span
			aria-hidden
			className={`bg-ink text-paper font-read grid shrink-0 place-items-center rounded-full leading-none font-bold italic ${
				large ? 'size-9 text-[17px]' : 'size-6 text-[13px]'
			}`}
		>
			{/* Italic leans right; the nudge puts its weight back in the middle. */}
			<span className="-translate-x-[0.04em] translate-y-[0.02em]">
				{monogramOf(email)}
			</span>
		</span>
	);
}
