import { useEffect } from 'react';
import { AccountDialog } from '../account/AccountDialog';
import { SignInDialog } from '../account/SignInDialog';
import { CheckoutDialog } from '../plan/CheckoutDialog';
import { LimitDialog } from '../plan/LimitDialog';
import { PlansDialog } from '../plan/PlansDialog';
import { UpgradedDialog } from '../plan/UpgradedDialog';
import { useLimitNudge } from '../plan/useLimitNudge';
import { followAddress, useDialog } from '../state/dialog';

/**
 * Whichever modal is open, mounted inside the shell so it answers the same
 * container queries as everything else, and drawn in the top layer so it sits
 * over all of it. The address is read here, once the shell is up, so a link to
 * `#plans` opens the plans over the app rather than before it.
 */
export function Dialogs() {
	useLimitNudge();
	useEffect(followAddress, []);
	const open = useDialog();

	if (open === 'account') return <AccountDialog />;
	if (open === 'plans') return <PlansDialog />;
	if (open === 'checkout') return <CheckoutDialog />;
	if (open === 'upgraded') return <UpgradedDialog />;
	if (open === 'limit') return <LimitDialog />;
	if (open === 'signin') return <SignInDialog />;
	return null;
}
