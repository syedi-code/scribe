import { api } from './client';
import type { Work } from './types';

/**
 * What is behind the answers.
 *
 * `GET /catalogue` is the public index of works that actually have a file, and
 * the worker edge-caches it. One fetch serves both readers of it — the count
 * under the wordmark and the shelves — and it is fetched once per tab, because
 * the library changes when a book is added, which is rarely.
 *
 * It is also allowed to fail. The count simply does not appear, because a
 * number nobody can vouch for is worse than no number.
 */
interface Catalogue {
	works: Work[];
}

let held: Promise<Work[]> | null = null;

export function libraryWorks(): Promise<Work[]> {
	held ??= api.get<Catalogue>('/catalogue').then((body) => body.works);
	return held;
}

export function libraryCount(): Promise<number | null> {
	return libraryWorks()
		.then((works) => works.length)
		.catch(() => null);
}
