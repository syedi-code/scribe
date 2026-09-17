import { useSyncExternalStore } from 'react';

/**
 * The smallest thing that can hold state two distant components share — the
 * open drawer, and whether uncited prose is dimmed. Both are one-at-a-time and
 * app-wide, and neither is worth a context or a state library.
 */
export interface Store<T> {
	get(): T;
	set(next: T | ((current: T) => T)): void;
	subscribe(listener: () => void): () => void;
}

export function createStore<T>(initial: T): Store<T> {
	let value = initial;
	const listeners = new Set<() => void>();
	return {
		get: () => value,
		set(next) {
			const resolved =
				typeof next === 'function'
					? (next as (current: T) => T)(value)
					: next;
			if (Object.is(resolved, value)) return;
			value = resolved;
			for (const listener of listeners) listener();
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
}

export function useStore<T>(store: Store<T>): T {
	return useSyncExternalStore(store.subscribe, store.get, store.get);
}
