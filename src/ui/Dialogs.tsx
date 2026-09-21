import { AccountDialog } from '../account/AccountDialog';
import { LimitDialog } from '../plan/LimitDialog';
import { PlansDialog } from '../plan/PlansDialog';
import { useLimitNudge } from '../plan/useLimitNudge';
import { useDialog } from '../state/dialog';

/**
 * Whichever modal is open, mounted inside the shell so it answers the same
 * container queries as everything else, and drawn in the top layer so it sits
 * over all of it.
 */
export function Dialogs() {
	useLimitNudge();
	const open = useDialog();

	if (open === 'account') return <AccountDialog />;
	if (open === 'plans') return <PlansDialog />;
	if (open === 'limit') return <LimitDialog />;
	return null;
}
