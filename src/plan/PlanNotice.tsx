import { COPY } from '../copy';
import { useAccount } from '../account/useAccount';
import { useConversation } from '../chat/context';
import { useFlag } from '../flags/context';
import { seePlans } from '../state/dialog';
import { remainingOf, standingOf, useAllowance } from '../state/allowance';
import { LookingNotice, VisitorNotice } from './VisitorNotice';
import { useStanding } from '../state/visitor';

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
 * the reader is never left to work out why typing stopped working. On the home
 * screen, spent, it is the whole of what the screen has to say, so it says
 * what is still open as well as what is not.
 *
 * Colour: none. An allowance is not a verdict, and the three status inks in
 * this app mean *found*, *not found* and *unknown* about a quotation. A limit
 * borrowing rubric would be the first place in the interface where a colour
 * meant two things.
 */
export function PlanNotice() {
	const shown = useFlag('isPlanLimitShown');
	const allowance = useAllowance();
	const { offerPlans } = useAccount();
	const { atHome } = useConversation();
	const standing = useStanding() === 'none' ? 'none' : standingOf(allowance);
	const left = remainingOf(allowance);

	if (standing === 'none') return <LookingNotice />;
	if (allowance?.guest) return <VisitorNotice allowance={allowance} />;
	if (!shown || !allowance) return null;
	if (standing !== 'last-few' && standing !== 'spent') return null;
	const spent = standing === 'spent';

	return (
		<div
			className="border-paper-deep bg-paper-lift mt-2 flex items-center gap-4 rounded-xl border px-3.5 py-3 @max-compact:flex-col @max-compact:items-stretch @max-compact:gap-2.5"
			// Polite, not assertive: this appears as an answer finishes, and
			// an assertive region would cut across the answer being read out.
			role="status"
			aria-live="polite"
		>
			<div className="min-w-0 flex-1">
				<p className="font-app text-ui text-ink m-0">
					{spent ? COPY.plan.spent : COPY.plan.remaining(left ?? 0)}
				</p>
				<p className="font-app text-small text-ink-soft m-0 mt-0.5">
					{/* Spent, the date is already in the closed composer
					    above, so it is not said twice. */}
					{!spent &&
						allowance.resets_at &&
						`${COPY.plan.resets(allowance.resets_at)} `}
					{spent && atHome
						? COPY.plan.stillOpen
						: offerPlans && COPY.plan.offer}
				</p>
			</div>
			{offerPlans && (
				<button
					type="button"
					onClick={seePlans}
					className={`font-app text-small shrink-0 rounded-full px-3.5 py-1.5 leading-none transition-[background-color,opacity] ${
						spent
							? 'bg-ink text-paper hover:opacity-85'
							: 'text-ink border-edge hover:bg-paper-deep border'
					}`}
				>
					{COPY.plan.see}
				</button>
			)}
		</div>
	);
}
