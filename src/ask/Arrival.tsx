import { useMemo, useState, type ReactNode } from 'react';
import { useReducedMotion } from '../lib/motion';
import { ArrivalContext, type ArrivalState } from './settle';

/**
 * The column, and the one thing everything on it shares: whether the wordmark
 * has finished writing itself out.
 *
 * Under `prefers-reduced-motion` nothing is withheld — the whole column is
 * there from the first frame, because a staggered reveal is still a wait
 * however quickly each piece fades.
 */
export function Arrival({ children }: { children: ReactNode }) {
	const reduced = useReducedMotion();
	const [ready, setReady] = useState(reduced);
	const value = useMemo<ArrivalState>(
		() => ({ ready, reduced, announce: () => setReady(true) }),
		[ready, reduced]
	);

	return (
		<ArrivalContext value={value}>
			<div className="row-span-full grid min-h-0 content-center justify-items-center px-5 pt-5 pb-[7vh] @max-compact:pt-[max(1.5rem,5vh)] @max-compact:pb-[6vh]">
				{children}
			</div>
		</ArrivalContext>
	);
}
