import './style.css';

/**
 * Scaffolding.
 *
 * scribe has no catalogue UI yet and deliberately no design system — see
 * README. What it does have is the one piece that has to work before any of
 * that is worth building: a request to alexandria that arrives authenticated.
 *
 * The browser calls /api/* on this origin. In production the Pages Function in
 * functions/api/ proxies that to the worker, lifting the Cloudflare Access JWT
 * out of the CF_Authorization cookie on the way. In development vite proxies
 * it to a local worker instead. Either way this page never makes a
 * cross-origin request, which is why there is no CORS handling anywhere here.
 */

interface Identity {
	user: {
		id: string;
		email: string;
		name: string | null;
		role: 'admin' | 'member';
	};
}

const app = document.querySelector<HTMLElement>('#app')!;

function render(rows: [string, string][], error?: string) {
	app.innerHTML = `
		<h1>scribe</h1>
		<p>Works, documents, and the reading half. Not built yet.</p>
		${error ? `<p class="bad">${error}</p>` : ''}
		<dl>
			${rows
				.map(
					([k, v]) =>
						`<div class="row"><dt>${k}</dt><dd>${v}</dd></div>`
				)
				.join('')}
		</dl>
	`;
}

async function handshake(): Promise<void> {
	render([['alexandria', 'connecting…']]);

	try {
		// POST /session first: it exchanges the Access JWT for the __session
		// cookie every other route expects.
		const session = await fetch('/api/session', { method: 'POST' });
		if (!session.ok) {
			throw new Error(`POST /api/session returned ${session.status}`);
		}

		const me = await fetch('/api/me');
		if (!me.ok) throw new Error(`GET /api/me returned ${me.status}`);

		const { user } = (await me.json()) as Identity;
		render([
			['alexandria', 'reachable'],
			['signed in as', user.email],
			['role', user.role],
			['user id', user.id],
		]);
	} catch (err) {
		render(
			[['alexandria', 'unreachable']],
			err instanceof Error ? err.message : String(err)
		);
	}
}

handshake();
