import { loadPlans } from '../api/billing';
import { COPY } from '../copy';
import { useAsync } from '../lib/useAsync';
import type { PlanOffer } from '../api/types';

/** The plans as alexandria offers them, asked once a tab. */
export const usePlans = () => useAsync(() => loadPlans(), []);

/**
 * A plan's price as a reader reads it, or the plain fact that there is none
 * yet. Never a made-up figure: a price on this page is a promise.
 */
export function priceOf(plan: PlanOffer): string {
	if (!plan.price) return COPY.plan.plans.priceLater;
	const { amount_cents, currency } = plan.price;
	const amount = new Intl.NumberFormat(undefined, {
		style: 'currency',
		currency,
		minimumFractionDigits: amount_cents % 100 ? 2 : 0,
	}).format(amount_cents / 100);
	return COPY.plan.plans.perMonth(amount);
}
