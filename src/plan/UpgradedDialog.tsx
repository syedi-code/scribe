import { COPY } from '../copy';
import { closeDialog } from '../state/dialog';
import { useAllowance } from '../state/allowance';
import { Modal } from '../ui/Modal';

/**
 * Back from Stripe, paid. Said once, briefly, and then out of the way.
 *
 * The plan is changed by Stripe's webhook, not by the redirect, and the two
 * race: a reader can land here a moment before alexandria has heard. So it
 * says what they bought rather than reading it back, and says the delay out
 * loud while the allowance still names the old plan — rather than showing
 * *Free* to someone who has just paid.
 */
export function UpgradedDialog() {
	const allowance = useAllowance();
	const pending = allowance !== null && allowance.plan !== 'paid';

	return (
		<Modal title={COPY.upgraded.title}>
			<p className="font-read text-ui text-ink-soft m-0 leading-normal">
				{COPY.upgraded.body}
			</p>
			{pending && (
				<p className="font-app text-small text-ink-faint m-0 mt-2">
					{COPY.upgraded.pending}
				</p>
			)}
			<button
				type="button"
				onClick={closeDialog}
				className="font-app text-ui bg-ink text-paper mt-5 w-full rounded-full px-4 py-3 leading-none transition-opacity hover:opacity-85"
			>
				{COPY.upgraded.start}
			</button>
		</Modal>
	);
}
