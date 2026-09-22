/**
 * Where a sign-in may send the reader back to: a path on this site, and
 * nothing else. `next` arrives in a URL anyone can write, so without this the
 * login route is an open redirect — a link that shows our address and lands
 * somewhere else. Anything that is not plainly our own path goes home.
 */
export function safeNext(next: string | null, origin: string): string {
	if (!next || !next.startsWith('/') || next.startsWith('//')) return '/';
	if ([...next].some((c) => c === '\\' || c.charCodeAt(0) < 0x20)) return '/';
	try {
		const target = new URL(next, origin);
		if (target.origin !== origin) return '/';
		if (target.pathname.startsWith('/login/')) return '/';
		return `${target.pathname}${target.search}${target.hash}`;
	} catch {
		return '/';
	}
}
