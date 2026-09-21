import type { ReactNode } from 'react';
import { describeApiError, openSession } from '../api/client';
import { useAsync } from '../lib/useAsync';
import { reportIdentity } from '../state/identity';
import { Wordmark } from './Wordmark';

/**
 * Nothing renders until the session is open: `POST /api/session` exchanges the
 * Cloudflare Access JWT for the cookie every other route expects, and a model
 * roster fetched before it would come back 401.
 *
 * While it is in flight the screen is paper and nothing else — a spinner for
 * something that takes one round trip is worse than a quiet page. If it fails,
 * the reason is the only thing on screen, in the reader's terms.
 */
export function SessionGate({ children }: { children: ReactNode }) {
	const session = useAsync(
		() => openSession().then((user) => (reportIdentity(user), user)),
		[]
	);

	if (session.loading) return <div className="bg-paper h-full" />;

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
