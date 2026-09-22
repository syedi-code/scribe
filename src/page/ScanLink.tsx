import { useAccount } from '../account/useAccount';
import { COPY } from '../copy';
import { seePlans } from '../state/dialog';

const LINK =
	'font-app text-small text-ink-soft hover:text-ink border-paper-deep border-b';

/**
 * The way from the passage to the paper it was read off.
 *
 * The scan of a cited page is part of Paid, so a reader on Free is shown
 * where it would be and what opens it, in the same quiet line: an offer in
 * the place the thing lives, not a banner about it. Pressed, it goes where
 * every offer goes (`seePlans`).
 */
export function ScanLink({ onOpen }: { onOpen: () => void }) {
	const { admin, plan } = useAccount();

	return admin || plan === 'paid' ? (
		<button type="button" onClick={onOpen} className={LINK}>
			{COPY.pageView.seeScan}
		</button>
	) : (
		<button type="button" onClick={seePlans} className={LINK}>
			{COPY.pageView.seeScanOnPaid}
		</button>
	);
}
