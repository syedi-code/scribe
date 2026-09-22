import { createStore, useStore } from '../lib/store';

/**
 * Which asking of `GET /models` is current. The roster is fetched once a tab,
 * which is right until the reader's plan changes under it — back from paying,
 * the tab that loaded on Free would go on offering Free's models. Bumping this
 * asks again.
 */
const version = createStore(0);

export const useRosterVersion = () => useStore(version);
export const refreshRoster = () => version.set((at) => at + 1);

/** Forgets how many times it was asked. Between tests. */
export const resetRoster = () => version.set(0);
