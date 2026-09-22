import { createStore, useStore } from '../lib/store';

/**
 * Whether this reader has a session at all.
 *
 * `account` and `guest` are sessions (`guest` a visitor's, scribe#38), and
 * the identity store says which. `none` is a visitor we could not make a
 * guest for — the address has made too many today, or the check did not
 * pass — so the app is there to look at and the first question opens the
 * sign-in dialog instead of being asked.
 */
export type Standing = 'account' | 'guest' | 'none';

const standing = createStore<Standing>('account');

export const useStanding = () => useStore(standing);
export const readStanding = () => standing.get();
export const reportStanding = (next: Standing) => standing.set(next);

/** Why the sign-in dialog was opened, so it can say so in its first line. */
export type SignInReason = 'spent' | 'blocked' | 'chosen';

const reason = createStore<SignInReason>('chosen');

export const useSignInReason = () => useStore(reason);
export const reportSignInReason = (next: SignInReason) => reason.set(next);
