import { useLayoutEffect, useRef, type RefObject } from 'react';
import { prefersReducedMotion } from '../lib/motion';
import { takeDeparture, type Departure } from './departure';
import { Wordmark } from './Wordmark';

/**
 * The home screen's wordmark, carried into the corner.
 *
 * The header's own mark is inside the fold, which clips while it opens and
 * fades in with it, so it cannot be the thing that travels. This is one copy,
 * drawn at the size and place the home mark had, moved and scaled onto the
 * header's mark over the same 300ms the fold takes; the header's mark is
 * hidden until it lands and then takes over where it lies. There is never a
 * frame with two marks, and nothing cross-fades.
 *
 * FLIP, on `translate` and `scale` rather than `transform`: Tailwind v4 sets
 * the longhands, and a transition on `transform` animates nothing.
 */

const TRAVEL_MS = 300;

export function Travel({
	mark,
	header,
	conceal,
}: {
	/** The header's own mark, which the copy lands on. */
	mark: RefObject<HTMLElement | null>;
	header: RefObject<HTMLElement | null>;
	/** Hides the header's mark while the copy is on its way to it. */
	conceal: (hidden: boolean) => void;
}) {
	const copy = useRef<HTMLDivElement>(null);
	// Taken once per mount and held: the effect may run twice, and the second
	// run would otherwise find the departure already spent.
	const from = useRef<Departure | null | undefined>(undefined);

	useLayoutEffect(() => {
		if (from.current === undefined) from.current = takeDeparture();
		const departure = from.current;
		const ghost = copy.current;
		const target = mark.current;
		const row = header.current;
		if (!departure || !ghost || !target || !row || prefersReducedMotion()) {
			return;
		}

		// Where the mark will be once the fold has opened. Its left edge does
		// not move; its top is the header's padding, because the mark and the
		// model line under it are the tallest thing in the row.
		const box = row.getBoundingClientRect();
		const left = target.getBoundingClientRect().left;
		const top = box.top + parseFloat(getComputedStyle(row).paddingTop);
		const scale = target.offsetWidth / departure.rect.width;

		ghost.style.transitionProperty = 'none';
		ghost.style.translate = '';
		ghost.style.scale = '';
		ghost.style.left = `${departure.rect.left}px`;
		ghost.style.top = `${departure.rect.top}px`;
		ghost.style.fontSize = `${departure.fontSize}px`;
		ghost.style.visibility = 'visible';
		conceal(true);

		// Committed at the start before the transition is switched on, or the
		// browser would skip straight to the end.
		void ghost.offsetWidth;
		ghost.style.transitionProperty = 'translate, scale';
		ghost.style.translate = `${left - departure.rect.left}px ${top - departure.rect.top}px`;
		ghost.style.scale = String(scale);

		const land = () => {
			conceal(false);
			ghost.style.visibility = 'hidden';
		};
		const timer = setTimeout(land, TRAVEL_MS + 60);
		return () => {
			clearTimeout(timer);
			land();
		};
	}, [mark, header, conceal]);

	return (
		<div
			ref={copy}
			aria-hidden
			className="pointer-events-none invisible fixed origin-top-left duration-300 ease-paper"
		>
			<Wordmark />
		</div>
	);
}
