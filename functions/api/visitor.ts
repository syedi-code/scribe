/// <reference types="@cloudflare/workers-types" />

import { visitorConfig } from '../../src/flags/visitor';

/**
 * `GET /api/visitor` — what the browser needs to let a visitor in: the
 * Turnstile site key. A site key is public by design (it is in every page
 * that shows the widget); the secret that checks its tokens is alexandria's.
 * Answered here, beside `/api/flags`, because it is a fact about this
 * deployment rather than about the library.
 */
export const onRequest: PagesFunction<Record<string, unknown>> = (context) =>
	new Response(JSON.stringify(visitorConfig(context.env)), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-store',
		},
	});
