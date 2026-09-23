import { createStore, useStore } from '../lib/store';
import type { Allowance } from '../api/types';

/**
 * What this reader has left this week.
 *
 * A store rather than a provider because it has two writers and no single
 * owner: the roster carries it when `GET /models` lands, and every finished
 * answer carries a fresher copy on its `finish`. A provider would have had to
 * belong to one of them and be told by the other.
 *
 * Null means not yet known — which is not the same as unlimited, and not the
 * same as spent. Nothing is said to the reader until it is known, because the
 * one thing worse than no counter is a counter that flashes a wrong number.
 */
const allowance = createStore<Allowance | null>(null);

export const useAllowance = () => useStore(allowance);

/** The current figure, for the places that are not a component. */
export const readAllowance = () => allowance.get();

/** Forgets the reader. Sign-out, and between tests. */
export const resetAllowance = () => allowance.set(null);

/**
 * Later news wins, with one exception: within one week, a payload cannot
 * lower `used` below a figure a finished answer has already reported. The
 * roster is fetched once a tab, and an answer finishing after it is newer, so
 * the roster's copy going stale is the expected case rather than a race.
 *
 * The exception is scoped to the week, which `resets_at` names. Without that
 * scope the guard eats the rollover: on the Monday the server
 * rightly says nought used, that is lower than yesterday's figure, and a
 * reader whose week had turned over would have gone on being told they had
 * none left until they reloaded the tab.
 */
export const reportAllowance = (next: Allowance | undefined | null) => {
	if (!next) return;
	allowance.set((current) =>
		current &&
		current.resets_at === next.resets_at &&
		next.used < current.used
			? current
			: next
	);
};

/** How close to the ceiling a reader is, which is what the interface reacts to. */
export type Standing =
	'unknown' | 'unlimited' | 'comfortable' | 'last-few' | 'spent';

/**
 * Two turns left is where the interface starts saying so.
 *
 * Earlier than that and a counter is noise on a tier nobody is near the end
 * of; later and the first a reader hears of a limit is the turn that is
 * refused, which is the one moment a nudge reads as a toll gate rather than
 * as information.
 */
export const LAST_FEW = 2;

export function standingOf(allowance: Allowance | null): Standing {
	if (!allowance) return 'unknown';
	if (allowance.limit === null) return 'unlimited';
	const left = allowance.limit - allowance.used;
	if (left <= 0) return 'spent';
	return left <= LAST_FEW ? 'last-few' : 'comfortable';
}

export const remainingOf = (allowance: Allowance | null): number | null =>
	!allowance || allowance.limit === null
		? null
		: Math.max(0, allowance.limit - allowance.used);
