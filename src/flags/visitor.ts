/** What `GET /api/visitor` answers, read off the deployment's environment. */
export interface VisitorConfig {
	/** Cloudflare Turnstile's public site key; null until one is set. */
	turnstile_site_key: string | null;
}

export function visitorConfig(
	env: Record<string, unknown> | undefined | null
): VisitorConfig {
	const key = env?.TURNSTILE_SITE_KEY;
	return {
		turnstile_site_key:
			typeof key === 'string' && key.trim() ? key.trim() : null,
	};
}
