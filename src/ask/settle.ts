import { createContext, use } from 'react';

/**
 * Coming to the home screen is an arrival: the wordmark writes itself out, and
 * everything under it settles in behind it, in order.
 *
 * The sequence lives here rather than in `Home`, so the column stays a list of
 * what is on it and each piece asks for its own place in the order.
 */
export interface ArrivalState {
	/** Whether the wordmark has finished writing, and the rest may appear. */
	ready: boolean;
	reduced: boolean;
	announce: () => void;
}

export const ArrivalContext = createContext<ArrivalState | null>(null);

export function useArrival(): ArrivalState {
	const value = use(ArrivalContext);
	if (!value) throw new Error('useArrival outside Arrival');
	return value;
}

/** Where each piece of the column falls in the sequence. */
export const SETTLE = {
	subtitle: 0,
	library: 1,
	composer: 2,
	suggestions: 3,
} as const;

/** The class and delay one child of the column fades in with. */
export function useSettle(order: number) {
	const { ready } = useArrival();
	return {
		className: ready ? 'animate-settle' : 'opacity-0',
		style: ready ? { animationDelay: `${order * 130}ms` } : undefined,
	};
}
