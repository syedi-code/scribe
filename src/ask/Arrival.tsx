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
 *
 * A phone too short for the whole column scrolls it, and it is centred only
 * while it fits (`content-center-safe`): centred regardless, its top spilled
 * up under the header, and its foot was clipped with no way to reach it.
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
			<div className="row-span-full grid min-h-0 grid-cols-[minmax(0,1fr)] content-center-safe justify-items-center overflow-y-auto overscroll-contain px-5 pt-5 pb-[7vh] @max-compact:pt-[max(1.5rem,5vh)] @max-compact:pb-[6vh]">
				{children}
			</div>
		</ArrivalContext>
	);
}
