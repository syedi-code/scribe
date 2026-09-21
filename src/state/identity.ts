import { createStore, useStore } from '../lib/store';
import type { Identity } from '../api/types';

/**
 * Who is signed in, as `GET /me` said when the session was opened. Set once by
 * `SessionGate`, which is the only thing that asks; read by the account menu
 * and dialog, which should not have to ask again.
 */
const identity = createStore<Identity['user'] | null>(null);

export const useIdentity = () => useStore(identity);
export const reportIdentity = (user: Identity['user']) => identity.set(user);
export const resetIdentity = () => identity.set(null);
