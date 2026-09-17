import { useEffect, useState } from 'react';

/**
 * `prefers-reduced-motion` is honoured with a real branch in the code, not only
 * a CSS override: the answer prints whole, every stamp resolves at once, and
 * the drawer is instant. A forty-second word-by-word reveal is still a
 * forty-second wait however fast each word fades.
 */
const QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
	return typeof matchMedia === 'function' && matchMedia(QUERY).matches;
}

export function useReducedMotion(): boolean {
	const [reduced, setReduced] = useState(prefersReducedMotion);
	useEffect(() => {
		const query = matchMedia(QUERY);
		const update = () => setReduced(query.matches);
		query.addEventListener('change', update);
		return () => query.removeEventListener('change', update);
	}, []);
	return reduced;
}

/** Stamps resolve in document order, so it reads as a pass down the page. */
export const RESOLVE_STAGGER_MS = 290;
