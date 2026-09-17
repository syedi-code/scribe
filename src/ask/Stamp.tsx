import { COPY } from '../copy';
import { describePage } from '../citations/page';
import { presentationOf } from '../citations/status';
import type { AnswerCitation, CitedPage } from '../api/types';

/**
 * The square after a quote.
 *
 *     filled        the words are on the page it named
 *     open          they are not — or they matched and then diverged
 *     dotted open   the page has no text layer; nothing could be checked
 *
 * Not a tick. The check means the words are there, not that they support the
 * claim, and a tick would be read as endorsing the argument. The shape carries
 * the verdict and the colour only reinforces it, so it survives being printed
 * and a reader who cannot tell rubric from verdigris still reads it correctly —
 * and the label says it in words, since the square says nothing to a screen
 * reader.
 */
export function Stamp({
	citation,
	page,
}: {
	citation: AnswerCitation | null;
	page: CitedPage | null;
}) {
	const { verdict, stamp } = presentationOf(citation);
	const where = page ? describePage(page) : null;
	const label = citation
		? where
			? COPY.stampLabel(verdict, where)
			: verdict
		: where
			? COPY.checkingLabel(where)
			: verdict;

	return (
		<span
			role="img"
			aria-label={label}
			title={label}
			className={`mr-[0.26em] ml-[0.34em] inline-block h-[0.66em] w-[0.66em] border-2 align-[-0.02em] transition-[background-color,border-color,transform] duration-300 ease-paper group-hover/cite:scale-115 ${stamp}`}
		/>
	);
}
