import { COPY } from '../copy';
import type { Identity } from './types';

/**
 * The browser only ever calls `/api/*` on this origin. In production the Pages
 * Function in `functions/api/` crosses to alexandria and lifts the Access JWT
 * out of the cookie; in development vite's proxy stands in for it. Same-origin
 * by construction — there is no CORS handling anywhere in this app, and adding
 * any would mean something else is wrong.
 */

export class ApiError extends Error {
	readonly status: number;
	/** alexandria's machine-readable reason, when it sends one. */
	readonly code: string | undefined;

	constructor(status: number, message: string, code?: string) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
	}
}

/** An error response as an ApiError, reading the body alexandria sends. */
export async function apiErrorOf(
	response: Response,
	fallback: string
): Promise<ApiError> {
	const body = (await response.json().catch(() => null)) as {
		error?: string;
		code?: string;
	} | null;
	return new ApiError(response.status, body?.error ?? fallback, body?.code);
}

/** What a reader is told when a request fails, in their terms rather than the wire's. */
export function describeApiError(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.status === 401 || error.status === 403) return COPY.signedOut;
		if (error.status === 404) return COPY.notFound;
		if (error.status >= 500) return COPY.serverDown;
		return error.message;
	}
	if (error instanceof Error && error.name === 'AbortError') return '';
	return COPY.offline;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`/api${path}`, {
		...init,
		headers: init?.body
			? { 'Content-Type': 'application/json', ...init?.headers }
			: init?.headers,
	});

	if (!response.ok) {
		throw await apiErrorOf(
			response,
			`${init?.method ?? 'GET'} ${path} failed`
		);
	}
	return response.status === 204
		? (undefined as T)
		: ((await response.json()) as T);
}

export const api = {
	get: <T>(path: string, init?: RequestInit) =>
		request<T>(path, { ...init, method: 'GET' }),
	post: <T>(path: string, body?: unknown, init?: RequestInit) =>
		request<T>(path, {
			...init,
			method: 'POST',
			body: body === undefined ? undefined : JSON.stringify(body),
		}),
	patch: <T>(path: string, body: unknown) =>
		request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
	del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/**
 * `POST /session` exchanges the Access JWT for the `__session` cookie every
 * other route expects, so it runs before anything else the app asks for.
 */
export async function openSession(): Promise<Identity['user']> {
	await api.post('/session');
	const { user } = await api.get<Identity>('/me');
	return user;
}

/**
 * `POST /session/guest` — a visitor's session, for a Turnstile token
 * Cloudflare will vouch for. alexandria makes the guest and sets the same
 * `__session` cookie a signed-in reader holds; everything after it is the
 * same request a reader makes.
 */
export async function openGuestSession(
	turnstileToken: string
): Promise<Identity['user']> {
	await api.post('/session/guest', { turnstile_token: turnstileToken });
	const { user } = await api.get<Identity>('/me');
	return user;
}

/**
 * Access's own sign-out, on this origin. It clears `CF_Authorization` and
 * sends the browser back through the login.
 */
const ACCESS_LOGOUT = '/cdn-cgi/access/logout';

/**
 * Signing out is two doors, and the order matters. alexandria's session goes
 * first: `POST /session` answers with whatever session the cookie still names,
 * so leaving it behind would sign the next person on this browser in as the
 * last one. It is an httpOnly cookie, so only the server can clear it.
 *
 * A failure there does not keep anyone signed in against their will — Access
 * still signs them out, and the session expires on its own.
 */
export async function signOut(): Promise<void> {
	await api.del('/session').catch(() => undefined);
	window.location.assign(ACCESS_LOGOUT);
}
