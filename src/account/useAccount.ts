import { useState } from 'react';
import { signOut } from '../api/client';
import { COPY } from '../copy';
import { remainingOf, standingOf, useAllowance } from '../state/allowance';
import { useIdentity } from '../state/identity';
import { useStanding } from '../state/visitor';

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
	const standing = useStanding();
	const allowance = useAllowance();
	const [leaving, setLeaving] = useState(false);

	const admin = identity?.role === 'admin';
	const plan = allowance?.plan ?? identity?.plan ?? 'free';
	// A guest session, or none at all: Pro belongs to an account.
	const visitor = standing !== 'account' || identity?.guest === true;

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
		offerPlans: !admin && plan !== 'paid' && !visitor,
		/**
		 * A visitor is not on any plan yet, and choosing Pro starts with
		 * signing in: the plans offer them that instead of checkout.
		 */
		visitor,
		allowance,
		/** Only once it is nearly spent: before that, a count gives the allowance away. */
		left:
			standingOf(allowance) === 'last-few' ||
			standingOf(allowance) === 'spent'
				? remainingOf(allowance)
				: null,
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
