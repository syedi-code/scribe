import { useEffect, useState } from 'react';
import { loadBilling } from '../api/billing';
import { refreshRoster } from '../state/roster';

/** How often to ask, and when to say the wait is longer than it should be. */
const EVERY_MS = 2000;
const SLOW_AFTER_MS = 30_000;
const GIVE_UP_AFTER_MS = 120_000;

export type Arrival = 'waiting' | 'slow' | 'arrived';

/**
 * Back from Stripe, waiting for Paid to land.
 *
 * The plan is changed by Stripe's webhook, not by the redirect, and the
 * redirect usually wins: the tab loads, asks for the roster, and is told Free.
 * So this asks alexandria again every two seconds until it says Paid, then
 * asks for the roster once more, so the switcher and the counter change
 * without a reload. Past thirty seconds it says the wait is long, and past two
 * minutes it stops asking; a webhook later than that is Stripe's to retry,
 * and the next page load will pick it up.
 */
export function usePlanArrival(alreadyPaid: boolean): Arrival {
	const [arrival, setArrival] = useState<Arrival>('waiting');

	useEffect(() => {
		if (alreadyPaid) return;
		const started = Date.now();
		let live = true;
		let timer: ReturnType<typeof setTimeout>;

		const ask = async () => {
			const billing = await loadBilling().catch(() => null);
			if (!live) return;
			if (billing?.plan === 'paid') {
				setArrival('arrived');
				refreshRoster();
				return;
			}
			const waited = Date.now() - started;
			if (waited >= SLOW_AFTER_MS) setArrival('slow');
			if (waited < GIVE_UP_AFTER_MS) timer = setTimeout(ask, EVERY_MS);
		};
		timer = setTimeout(ask, EVERY_MS);

		return () => {
			live = false;
			clearTimeout(timer);
		};
	}, [alreadyPaid]);

	return alreadyPaid ? 'arrived' : arrival;
}
