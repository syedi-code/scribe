import { COPY } from '../copy';
import { useAccount } from '../account/useAccount';
import { closeDialog, seePlans } from '../state/dialog';
import { remainingOf, standingOf, useAllowance } from '../state/allowance';
import { Modal } from '../ui/Modal';

/**
 * The month running down, said once, in the conversation where it happens.
 *
 * The line under the composer says the same thing, but a line is easy to read
 * past while an answer is being read; this is raised at two left and again at
 * none, and at no other time (`useLimitNudge`). It is a pause rather than a
 * gate — *Not now* is as large as the offer, and nothing behind it is locked.
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
			<p className="font-read text-ui text-ink-soft m-0 leading-normal">
				{spent
					? COPY.plan.nudge.spentBody
					: COPY.plan.nudge.lastFewBody}
			</p>
			{allowance && (
				<p className="font-app text-small text-ink-faint mt-2 mb-0">
					{spent
						? COPY.plan.back(allowance.resets_at)
						: COPY.plan.resets(allowance.resets_at)}
				</p>
			)}
			{offerPlans && (
				<p className="font-app text-small text-ink-soft border-paper-deep mt-4 mb-0 border-t pt-4">
					{COPY.plan.offer}
				</p>
			)}
			<div className="mt-5 flex justify-end gap-2">
				<button
					type="button"
					onClick={closeDialog}
					className="font-app text-ui text-ink-soft hover:text-ink hover:bg-paper-deep rounded-full px-4 py-2 leading-none transition-colors"
				>
					{COPY.plan.nudge.later}
				</button>
				{offerPlans && (
					<button
						type="button"
						onClick={seePlans}
						className="font-app text-ui bg-ink text-paper rounded-full px-4 py-2 leading-none transition-opacity hover:opacity-85"
					>
						{COPY.plan.see}
					</button>
				)}
			</div>
		</Modal>
	);
}
