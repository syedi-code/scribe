import { api, ApiError } from './client';
import type { PlanOffer } from './types';

/**
 * What each plan gives, as alexandria says — the same numbers and models it
 * enforces, so the plans cannot promise what the server would refuse. Asked
 * once a tab: a plan does not change while someone is looking at it.
 */
let plans: Promise<PlanOffer[]> | null = null;

export function loadPlans(): Promise<PlanOffer[]> {
	plans ??= api.get<{ plans: PlanOffer[] }>('/plans').then(
		(body) => body.plans,
		(error: unknown) => {
			plans = null;
			throw error;
		}
	);
	return plans;
}

/** Forgets the plans. Between tests. */
export const forgetPlans = () => {
	plans = null;
};

export type Checkout = { kind: 'redirect'; url: string } | { kind: 'not-open' };

/**
 * Asks alexandria for a Stripe Checkout session. It answers with the hosted
 * page's address, and the browser goes there: card details are typed into
 * Stripe's page, never into this one, and this app never sees them.
 *
 * Until checkout exists alexandria answers 501 `CHECKOUT_NOT_OPEN`, and that
 * is a result rather than a failure — the reader is told plainly and nothing
 * is charged. Everything else is a failure and is thrown.
 */
export async function startCheckout(): Promise<Checkout> {
	try {
		const { url } = await api.post<{ url: string }>('/billing/checkout');
		return { kind: 'redirect', url };
	} catch (error) {
		if (error instanceof ApiError && error.status === 501)
			return { kind: 'not-open' };
		throw error;
	}
}
