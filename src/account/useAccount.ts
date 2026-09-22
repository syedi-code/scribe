import { useState } from 'react';
import { signOut } from '../api/client';
import { COPY } from '../copy';
import { remainingOf, useAllowance } from '../state/allowance';
import { useIdentity } from '../state/identity';

/**
 * Who is signed in and what they are on, said the same way in the menu and in
 * the dialog.
 *
 * The plan is read off the allowance first, because that copy is refreshed by
 * every finished answer; `/me` only knows what was true when the tab opened.
 * The admin is named as the admin rather than as a plan, because the admin is
 * exempt by role, not by paying — and "Free" beside an account with no limit
 * would be the one untrue thing on the sheet.
 */
export function useAccount() {
	const identity = useIdentity();
	const allowance = useAllowance();
	const [leaving, setLeaving] = useState(false);

	const admin = identity?.role === 'admin';
	const plan = allowance?.plan ?? identity?.plan ?? 'free';

	return {
		email: identity?.email ?? '',
		admin,
		plan,
		planName: admin
			? COPY.account.admin
			: plan === 'paid'
				? COPY.plan.plans.paid
				: COPY.plan.plans.free,
		/**
		 * Nobody is offered what they already have, or what the admin never
		 * needs; a visitor is asked to sign in first, not sold a plan.
		 */
		offerPlans: !admin && plan !== 'paid' && !identity?.guest,
		allowance,
		left: remainingOf(allowance),
		leaving,
		signOut: () => {
			setLeaving(true);
			void signOut();
		},
	};
}

/** The first letter of the address, for the button that opens the menu. */
export const monogramOf = (email: string) =>
	(email.match(/[a-z0-9]/i)?.[0] ?? '·').toUpperCase();
