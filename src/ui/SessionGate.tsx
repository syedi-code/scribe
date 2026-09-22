import { useRef, type ReactNode } from 'react';
import { describeApiError } from '../api/client';
import { loadFlags } from '../flags/load';
import { useAsync } from '../lib/useAsync';
import { openReader } from './openReader';
import { Wordmark } from './Wordmark';

/**
 * Nothing renders until the session is open: `POST /api/session` exchanges the
 * Cloudflare Access JWT for the cookie every other route expects, and a model
 * roster fetched before it would come back 401.
 *
 * With visitor mode on, a visitor with no session is made a guest instead, or
 * let in to look without one (`openReader`), so the gate only ever stops a
 * reader when something is actually wrong.
 *
 * While it is in flight the screen is paper and nothing else — a spinner for
 * something that takes one round trip is worse than a quiet page. The one
 * thing on it is the slot Turnstile draws into, for the few visitors it wants
 * a click from. If opening fails, the reason is the only thing on screen, in
 * the reader's terms.
 */
export function SessionGate({ children }: { children: ReactNode }) {
	const slot = useRef<HTMLDivElement>(null);
	const session = useAsync(
		() =>
			openReader(
				async () => (await loadFlags()).isVisitorModeEnabled,
				() => slot.current
			),
		[]
	);

	if (session.loading) {
		return (
			<div className="bg-paper grid h-full content-end justify-items-center pb-10">
				<div ref={slot} />
			</div>
		);
	}

	if (session.error) {
		return (
			<div className="bg-paper grid h-full content-center justify-items-center gap-3 px-6 text-center">
				<Wordmark className="text-3xl" />
				<p className="font-app text-small text-rubric m-0">
					{describeApiError(session.error)}
				</p>
			</div>
		);
	}

	return children;
}
