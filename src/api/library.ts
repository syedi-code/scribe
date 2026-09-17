import { api } from './client';

/**
 * How many books are behind the answers.
 *
 * `GET /catalogue` is the public index of works that actually have a file, and
 * the worker edge-caches it: a count is the cheapest honest thing the home
 * screen can say about the library. It is also allowed to fail — the line
 * simply does not appear, because a number nobody can vouch for is worse than
 * no number.
 */
interface Catalogue {
	works: unknown[];
}

let counted: Promise<number | null> | null = null;

export function libraryCount(): Promise<number | null> {
	counted ??= api
		.get<Catalogue>('/catalogue')
		.then((body) => body.works.length)
		.catch(() => null);
	return counted;
}
