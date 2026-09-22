import { api, ApiError } from './client';
import type { Billing, PlanOffer } from './types';

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

export type Checkout =
	| { kind: 'redirect'; url: string }
	| { kind: 'not-open' }
	| { kind: 'already-paid' };

/**
 * Asks alexandria for a Stripe Checkout session. It answers with the hosted
 * page's address, and the browser goes there: card details are typed into
 * Stripe's page, never into this one, and this app never sees them.
 *
 * Until checkout exists alexandria answers 501 `CHECKOUT_NOT_OPEN`, and that
 * is a result rather than a failure — the reader is told plainly and nothing
 * is charged. So is 409 `ALREADY_PAID`: Stripe already holds a payment the
 * page had not heard of yet, and a second checkout would bill twice.
 * Everything else is a failure and is thrown.
 */
export async function startCheckout(): Promise<Checkout> {
	try {
		const { url } = await api.post<{ url: string }>('/billing/checkout');
		return { kind: 'redirect', url };
	} catch (error) {
		if (error instanceof ApiError && error.status === 501)
			return { kind: 'not-open' };
		if (error instanceof ApiError && error.code === 'ALREADY_PAID')
			return { kind: 'already-paid' };
		throw error;
	}
}

/**
 * What alexandria knows of this reader's billing. Asked fresh each time: it
 * is what changes while a reader is away paying or cancelling.
 */
export const loadBilling = () =>
	api.get<{ billing: Billing }>('/billing').then((body) => body.billing);

/**
 * Stripe's own page for the card, the invoices and cancelling. Like checkout,
 * a link minted here and followed; nothing about the card touches this app.
 */
export const openPortal = () =>
	api.post<{ url: string }>('/billing/portal').then((body) => body.url);
