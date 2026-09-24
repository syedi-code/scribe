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
	const amount = amountOf(plan);
	return amount
		? COPY.plan.plans.perMonth(amount)
		: COPY.plan.plans.priceLater;
}

/** The amount alone, for a page that sets the period beside it; null if unpriced. */
export function amountOf(plan: PlanOffer): string | null {
	if (!plan.price) return null;
	const { amount_cents, currency } = plan.price;
	return money(amount_cents, currency);
}

/** Free's price, in the currency Pro is sold in, so the two read as one scale. */
export const nothingIn = (paid: PlanOffer): string =>
	money(0, paid.price?.currency ?? 'usd');

const money = (cents: number, currency: string) =>
	new Intl.NumberFormat(undefined, {
		style: 'currency',
		currency,
		minimumFractionDigits: cents % 100 ? 2 : 0,
	}).format(cents / 100);

/**
 * Pro's allowance as a multiple of Free's. The multiple is what the plans say,
 * never either number: the allowance is tuned week to week, and Free is
 * derived from Pro, so only the ratio holds still.
 */
export const timesFree = (free: PlanOffer, paid: PlanOffer): number =>
	Math.round(paid.turns_per_week / Math.max(1, free.turns_per_week));
