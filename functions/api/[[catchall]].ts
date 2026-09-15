/// <reference types="@cloudflare/workers-types" />

interface ProxyEnv {
	WORKER_URL: string;
}

export const onRequest: PagesFunction<ProxyEnv> = async (context) => {
	const workerUrl = context.env.WORKER_URL;
	if (!workerUrl) {
		return new Response(
			JSON.stringify({ error: 'WORKER_URL not configured' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}

	// Build the target URL: replace /api/* with the worker's /api/*
	const url = new URL(context.request.url);
	const targetUrl = `${workerUrl}${url.pathname}${url.search}`;

	// Forward request headers, extracting CF Access JWT from cookie if present
	const headers = new Headers(context.request.headers);

	// The CF Access JWT may arrive as a header (initial page load) or as a cookie
	// (subsequent requests). Extract from cookie and set as header for the Worker.
	let cfAccessJwt = context.request.headers.get('Cf-Access-Jwt-Assertion');
	if (!cfAccessJwt) {
		const cookies = context.request.headers.get('cookie') || '';
		const match = cookies.match(/CF_Authorization=([^;]+)/);
		if (match) {
			cfAccessJwt = match[1];
		}
	}
	if (cfAccessJwt) {
		headers.set('cf-access-jwt-assertion', cfAccessJwt);
	}

	// Remove host header so it doesn't conflict with the worker's domain
	headers.delete('host');

	const response = await fetch(targetUrl, {
		method: context.request.method,
		headers,
		body:
			context.request.method !== 'GET' &&
			context.request.method !== 'HEAD'
				? context.request.body
				: undefined,
	});

	// Return the worker's response, stripping CORS headers (same-origin doesn't need them)
	const responseHeaders = new Headers(response.headers);
	responseHeaders.delete('access-control-allow-origin');
	responseHeaders.delete('access-control-allow-methods');
	responseHeaders.delete('access-control-allow-headers');
	responseHeaders.delete('access-control-allow-credentials');

	// Explicitly re-set Set-Cookie headers to avoid header flattening.
	// new Headers() can merge multiple Set-Cookie into one combined value,
	// which iOS WebKit rejects — causing cookies to silently not be set on mobile.
	const setCookies = response.headers.getSetCookie();
	if (setCookies.length > 0) {
		responseHeaders.delete('set-cookie');
		for (const cookie of setCookies) {
			responseHeaders.append('set-cookie', cookie);
		}
		console.log(
			`[proxy] Forwarding ${setCookies.length} Set-Cookie header(s) for ${context.request.method} ${new URL(context.request.url).pathname}`
		);
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: responseHeaders,
	});
};
