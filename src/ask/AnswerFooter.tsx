import { COPY } from '../copy';
import { toggleOnlyCited, useOnlyCited } from '../state/reader';
import type { AnswerCitation } from '../api/types';

/**
 * The tally, and the one control that says what the answer is *not* standing
 * on.
 *
 * The count is of quotes found on the page they named — not of quotes that
 * support the claim, which is not what was measured and is not what anything
 * here says.
 */
export function AnswerFooter({
	citations,
	total,
	resolved,
	model,
}: {
	citations: (AnswerCitation | null)[];
	total: number;
	resolved: number;
	model: string | null;
}) {
	const onlyCited = useOnlyCited();
	const checking = resolved < total;
	const found = citations
		.slice(0, resolved)
		.filter((citation) => citation?.status === 'verified').length;

	return (
		<div className="font-app text-small text-ink-faint mt-4 flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
			<span>
				{total === 0
					? COPY.noCitations
					: checking
						? COPY.checking(total)
						: COPY.tally(found, total)}
				{model && !checking ? ` — ${model}` : ''}
			</span>
			<button
				type="button"
				onClick={toggleOnlyCited}
				aria-pressed={onlyCited}
				title={COPY.onlyCitedHint}
				className={`font-app border-b transition-colors ${
					onlyCited
						? 'text-ink border-ink'
						: 'border-paper-deep hover:text-ink hover:border-ink'
				}`}
			>
				{COPY.onlyCited}
			</button>
		</div>
	);
}
