import { useEffect, useState } from 'react';
import { loadBilling, openPortal } from '../api/billing';
import { COPY } from '../copy';
import { useAsync } from '../lib/useAsync';
import { refreshRoster } from '../state/roster';
import type { Billing as BillingState } from '../api/types';

/**
 * Under the plan's name in the account sheet: when it renews or ends, and the
 * way to Stripe's billing page.
 *
 * Read fresh each time the sheet opens, because this is the fact that changes
 * while a reader is away — they come back here from cancelling. If what
 * alexandria says of the plan is not what the rest of the tab believes, the
 * roster is asked again, so the switcher and the counter follow at once.
 */
export function Billing({ plan }: { plan: 'free' | 'paid' }) {
	const billing = useAsync(() => loadBilling(), []);
	const known = billing.value;

	useEffect(() => {
		if (known && known.plan !== plan) refreshRoster();
	}, [known, plan]);

	if (!known) return null;
	return (
		<>
			<Standing billing={known} />
			{known.manageable && <Manage />}
		</>
	);
}

function Standing({ billing }: { billing: BillingState }) {
	const subscription = billing.subscription;
	if (!subscription) return null;
	const line =
		subscription.status === 'past_due'
			? COPY.account.pastDue
			: subscription.ends_at
				? COPY.account.ends(subscription.ends_at)
				: subscription.renews_at
					? COPY.account.renews(subscription.renews_at)
					: null;
	if (!line) return null;
	return (
		<span className="font-app text-small text-ink-faint mt-1 block">
			{line}
		</span>
	);
}

/**
 * A link to Stripe's page, minted when pressed and followed at once. The
 * navigation is the press, never a tab opened after an await, which a phone
 * would block as a popup.
 */
function Manage() {
	const [state, setState] = useState<'ready' | 'opening' | 'failed'>('ready');

	const open = async () => {
		setState('opening');
		try {
			window.location.assign(await openPortal());
		} catch {
			setState('failed');
		}
	};

	return (
		<span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
			<button
				type="button"
				onClick={open}
				disabled={state === 'opening'}
				className="font-app text-small text-ink border-edge enabled:hover:bg-paper-deep shrink-0 rounded-full border px-3 py-1 leading-none transition-colors disabled:text-ink-faint"
			>
				{state === 'opening'
					? COPY.account.opening
					: COPY.account.manage}
			</button>
			<span
				role={state === 'failed' ? 'alert' : undefined}
				className={`font-app text-small m-0 ${
					state === 'failed' ? 'text-rubric' : 'text-ink-faint'
				}`}
			>
				{state === 'failed'
					? COPY.account.manageFailed
					: COPY.account.manageNote}
			</span>
		</span>
	);
}
