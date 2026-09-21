import { COPY } from '../copy';
import { useAccount } from '../account/useAccount';
import { closeDialog, seePlans } from '../state/dialog';
import { remainingOf, standingOf, useAllowance } from '../state/allowance';
import { Modal } from '../ui/Modal';

/**
 * The month running down, said once, in the conversation where it happens.
 *
 * Raised at two left and again at none, and at no other time
 * (`useLimitNudge`). It is the count, the day it resets, and the two ways on —
 * nothing else. It had a paragraph once, which said the same thing as the
 * title in more words, and a reader looking up from an answer should not have
 * to read a paragraph to learn a number.
 *
 * A pause rather than a gate: *Not now* is as large as the offer, and nothing
 * behind it is locked.
 */
export function LimitDialog() {
	const allowance = useAllowance();
	const { offerPlans } = useAccount();
	const spent = standingOf(allowance) === 'spent';
	const left = remainingOf(allowance) ?? 0;

	return (
		<Modal
			title={
				spent ? COPY.plan.nudge.spent : COPY.plan.nudge.lastFew(left)
			}
		>
			{allowance && (
				<p className="font-app text-ui text-ink-soft m-0">
					{spent
						? COPY.plan.back(allowance.resets_at)
						: COPY.plan.resets(allowance.resets_at)}
				</p>
			)}
			<div className="mt-6 flex justify-end gap-2 @max-compact:flex-col-reverse">
				<button
					type="button"
					onClick={closeDialog}
					className="font-app text-ui text-ink-soft hover:text-ink hover:bg-paper-deep rounded-full px-4 py-2.5 leading-none transition-colors @max-compact:py-3"
				>
					{COPY.plan.nudge.later}
				</button>
				{offerPlans && (
					<button
						type="button"
						onClick={seePlans}
						className="font-app text-ui bg-ink text-paper rounded-full px-5 py-2.5 leading-none transition-opacity hover:opacity-85 @max-compact:py-3"
					>
						{COPY.plan.see}
					</button>
				)}
			</div>
		</Modal>
	);
}
