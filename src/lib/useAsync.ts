import { useEffect, useState } from 'react';

export interface Async<T> {
	value: T | null;
	loading: boolean;
	error: unknown;
}

const IDLE: Async<never> = { value: null, loading: false, error: null };

/**
 * One fetch, resolved into render state, dropped if the component moves on
 * before it lands. Everything this app fetches outside the chat stream is one
 * request deep, which is the whole reason there is no data library here.
 */
export function useAsync<T>(
	run: (() => Promise<T>) | null,
	deps: readonly unknown[]
): Async<T> {
	const [settled, setSettled] = useState<Omit<Async<T>, 'loading'> | null>(
		null
	);

	useEffect(() => {
		if (!run) return;
		let live = true;
		run().then(
			(value) => live && setSettled({ value, error: null }),
			(error: unknown) => live && setSettled({ value: null, error })
		);
		return () => {
			live = false;
			// A new request is in flight, so what the last one returned is
			// stale rather than merely old.
			setSettled(null);
		};
		// The caller says what this fetch depends on; `run` is a fresh closure
		// every render and would defeat that.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps);

	if (!run) return IDLE;
	return settled
		? { ...settled, loading: false }
		: { value: null, error: null, loading: true };
}
