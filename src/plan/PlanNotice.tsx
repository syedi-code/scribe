import { useState } from 'react';
import { COPY } from '../copy';
import { useFlag } from '../flags/context';
import { remainingOf, standingOf, useAllowance } from '../state/allowance';

/**
 * What is left of the month, and what a paid plan would give instead.
 *
 * It sits under the composer, which is the one place in this app a reader is
 * already looking when they are about to spend a question. It is deliberately
 * not chrome: a tally in the corner from the first question makes a reading
 * tool feel metered from the first minute, and a library should not.
 *
 * So it says nothing at all until two questions are left, and then it says one
 * line. Spent, the same line becomes the reason the composer has gone quiet —
 * the reader is never left to work out why typing stopped working.
 *
 * Colour: none. An allowance is not a verdict, and the three status inks in
 * this app mean *found*, *not found* and *unknown* about a quotation. A limit
 * borrowing rubric would be the first place in the interface where a colour
 * meant two things.
 */
export function PlanNotice() {
	const shown = useFlag('isPlanLimitShown');
	const allowance = useAllowance();
	const standing = standingOf(allowance);
	const left = remainingOf(allowance);

	if (!shown) return null;
	if (standing !== 'last-few' && standing !== 'spent') return null;

	return (
		<div
			className="border-paper-deep mt-2 rounded-xl border px-3 py-2.5"
			// Polite, not assertive: this appears as an answer finishes, and
			// an assertive region would cut across the answer being read out.
			role="status"
			aria-live="polite"
		>
			<p className="font-app text-small text-ink">
				{standing === 'spent'
					? COPY.plan.spent
					: COPY.plan.remaining(left ?? 0)}{' '}
				{allowance && (
					<span className="text-ink-soft">
						{COPY.plan.resets(allowance.resets_at)}
					</span>
				)}
			</p>
			<p className="font-app text-small text-ink-soft mt-1">
				{COPY.plan.offer}
			</p>
			<SeePlans />
		</div>
	);
}

/**
 * The upgrade path, as a placeholder.
 *
 * There is nothing to link to yet — checkout is not built — and a button that
 * silently does nothing is worse than no button, because a reader who presses
 * it concludes the app is broken rather than unfinished. So it says what it
 * is. When checkout exists this becomes an anchor and the state below goes.
 */
function SeePlans() {
	const [pressed, setPressed] = useState(false);

	return (
		<p className="mt-2">
			<button
				type="button"
				onClick={() => setPressed(true)}
				className="font-app text-small text-ink border-paper-deep hover:bg-paper-deep rounded-full border px-3 py-1 leading-none transition-colors"
			>
				{COPY.plan.see}
			</button>
			{pressed && (
				<span className="font-app text-small text-ink-soft ml-2">
					{COPY.plan.soon}
				</span>
			)}
		</p>
	);
}
