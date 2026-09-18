import { COPY } from '../copy';
import { describePage } from '../citations/page';
import { presentationOf } from '../citations/status';
import { useCitedPage } from '../citations/useCitedPage';
import { openPage } from '../state/reader';
import type { AnswerCitation } from '../api/types';

/**
 * The evidence, in the prose.
 *
 * Quoted words are set one weight heavier than the light face around them and
 * the quotation marks drop back to a faint grey, so the source's words read as
 * quoted before any verdict is in.
 *
 * The verdict is the rule under those words. It was a small square after the
 * closing quotation mark for a long time, on the reasoning that a rule under a
 * twenty-word quote pulls the eye off the sentence it supports — but a mark
 * after the quote says nothing about *which* words were checked, and a reader
 * on a phone got a 10px square to aim a finger at. The rule is drawn under the
 * quoted words, which are exactly the words the server checked, thin and set
 * clear of the descenders.
 *
 * Style carries the verdict as well as colour — solid found, wavy not found,
 * dotted unknown — so it survives being printed and a reader who cannot tell
 * verdigris from rubric still reads it correctly. The square also said the
 * verdict in words to a screen reader, and that is kept.
 */
export function Citation({
	index,
	quote,
	citation,
	lit,
	onLight,
	onAnchor,
}: {
	index: number;
	quote: string;
	citation: AnswerCitation | null;
	lit: boolean;
	onLight: (index: number | null) => void;
	onAnchor: (index: number, element: HTMLElement | null) => void;
}) {
	const { page } = useCitedPage(citation);
	const { verdict, underline } = presentationOf(citation);
	const where = page ? describePage(page) : null;
	// The rule is a colour and a shape; this is the same fact in words, for a
	// reader who is having the page read to them.
	const label = citation
		? where
			? COPY.stampLabel(verdict, where)
			: verdict
		: where
			? COPY.checkingLabel(where)
			: verdict;
	const open = (element: HTMLElement) =>
		citation && openPage(citation, element);

	return (
		<span
			ref={(element) => onAnchor(index, element)}
			role="button"
			tabIndex={0}
			aria-disabled={!citation}
			onClick={(event) => open(event.currentTarget)}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					open(event.currentTarget);
				}
			}}
			onMouseEnter={() => onLight(index)}
			onMouseLeave={() => onLight(null)}
			onFocus={() => onLight(index)}
			onBlur={() => onLight(null)}
			className={`quote-mark hover:bg-bubble cursor-pointer rounded-[3px] font-light transition-colors duration-200 ${
				lit ? 'bg-bubble' : ''
			}`}
		>
			<span className="text-ink-faint">“</span>
			<span className={`font-normal ${underline}`}>{quote}</span>
			<span className="text-ink-faint">”</span>
			<span className="sr-only">{` — ${label}`}</span>
		</span>
	);
}
