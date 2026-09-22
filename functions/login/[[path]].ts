/// <reference types="@cloudflare/workers-types" />

import { safeNext } from '../../src/lib/safeNext';

interface LoginEnv {
	WORKER_URL: string;
}

/**
 * `/login/<way>` — where the sign-in dialog's buttons go.
 *
 * Each path is guarded by a Cloudflare Access application that allows one
 * way of signing in, so by the time a request reaches this function Access
 * has already sent the reader to GitHub or Google and back, and attached the
 * signed assertion of who they are.
 *
 * The session is opened here, with that assertion, rather than left to the
 * app on its return: Access scopes its own cookie to the application's path,
 * and a cookie set under `/login/github` never reaches `/api`. The visitor's
 * guest cookie goes along, so alexandria carries their questions into the
 * account. Then the reader is sent back to where they were — only ever a
 * path on this site (`safeNext`).
 */
export const onRequest: PagesFunction<LoginEnv> = async (context) => {
	const url = new URL(context.request.url);
	const back = new URL(
		safeNext(url.searchParams.get('next'), url.origin),
		url.origin
	);
	const headers = new Headers({ Location: back.toString() });

	const assertion = context.request.headers.get('Cf-Access-Jwt-Assertion');
	if (assertion && context.env.WORKER_URL) {
		try {
			const opened = await fetch(`${context.env.WORKER_URL}/api/session`, {
				method: 'POST',
				headers: {
					'cf-access-jwt-assertion': assertion,
					cookie: context.request.headers.get('cookie') ?? '',
				},
			});
			// One header per cookie: WebKit refuses them merged.
			for (const cookie of opened.headers.getSetCookie()) {
				headers.append('set-cookie', cookie);
			}
		} catch (error) {
			// The app opens the session on its return if this could not.
			console.error('[login] the session could not be opened', error);
		}
	}

	return new Response(null, { status: 302, headers });
};
