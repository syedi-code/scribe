import { describeApiError, openSession } from './api/client';
import { ChatProvider } from './chat/ChatProvider';
import { useAsync } from './lib/useAsync';
import { ModelProvider } from './models/ModelProvider';
import { AppFrame } from './ui/AppFrame';
import { Wordmark } from './ui/Wordmark';

/**
 * scribe-lm.
 *
 * Nothing renders until the session is open: `POST /api/session` exchanges the
 * Cloudflare Access JWT for the cookie every other route expects, and a model
 * roster fetched before it would come back 401.
 */
export function App() {
	const session = useAsync(() => openSession(), []);

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

	return (
		<ModelProvider>
			<ChatProvider>
				<AppFrame />
			</ChatProvider>
		</ModelProvider>
	);
}
