import { useEffect, useState } from 'react';
import { RESOLVE_STAGGER_MS, useReducedMotion } from '../lib/motion';
import type { AnswerCitation } from '../api/types';

/**
 * Verification is an event, and the reader watches it happen.
 *
 * Citations arrive in a `data-citations` part *after* the answer is written, so
 * for a second or two the answer exists unchecked. That interval is not a
 * loading state to paper over — it is the most honest moment in the product.
 * Stamps arrive pending and resolve one at a time down the page, in the order
 * they appear.
 *
 * An answer being re-read from history was checked long ago, so it resolves
 * whole; there is nothing happening to watch.
 */
export function useStaggeredResolve(
	total: number,
	citations: AnswerCitation[] | undefined,
	watching: boolean
): number {
	const reduced = useReducedMotion();
	const atOnce = !watching || reduced;
	const [ticked, setTicked] = useState(0);

	useEffect(() => {
		if (!citations || atOnce) return;
		let at = 0;
		const timer = setInterval(() => {
			at += 1;
			setTicked(at);
			if (at >= total) clearInterval(timer);
		}, RESOLVE_STAGGER_MS);
		return () => clearInterval(timer);
	}, [citations, total, atOnce]);

	if (!citations) return 0;
	return atOnce ? total : Math.min(ticked, total);
}
