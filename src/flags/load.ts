import { api } from '../api/client';
import { DEFAULT_FLAGS, type Flags } from './flags';

let asked: Promise<Flags> | null = null;

/**
 * `GET /api/flags`, asked once a tab and shared: by `FlagProvider`, and by
 * `SessionGate`, which needs one flag only if the session is refused and must
 * not make every signed-in reader wait for the flags before it opens theirs.
 * A failure reads as every flag's fallback, which is *off*.
 */
export function loadFlags(): Promise<Flags> {
	asked ??= api.get<Flags>('/flags').catch(() => DEFAULT_FLAGS);
	return asked;
}

/** Forgets the flags. Between tests. */
export const forgetFlags = () => {
	asked = null;
};
