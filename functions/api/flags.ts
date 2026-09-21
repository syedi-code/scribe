/// <reference types="@cloudflare/workers-types" />

import { readFlags } from '../../src/flags/flags';

/**
 * `GET /api/flags` — the feature flags, read off this deployment's
 * environment.
 *
 * It sits beside the proxy in `[[catchall]].ts` and wins the route because
 * Pages matches the more specific file first: this is the one `/api/*` path
 * the browser asks of scribe itself rather than of alexandria.
 *
 * Never cached. The whole point of a flag is that flipping a variable changes
 * what the next reader gets.
 */
export const onRequest: PagesFunction<Record<string, unknown>> = (context) =>
	new Response(JSON.stringify(readFlags(context.env)), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'no-store',
		},
	});
