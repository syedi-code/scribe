import { useLayoutEffect, type RefObject } from 'react';

/**
 * Where the home screen's wordmark was when the home screen went.
 *
 * Asking the first question cut from one screen to the other: the mark was
 * large and centred on one, small and in the corner on the next, and nothing
 * connected them. The home mark writes down its box as it leaves, and the
 * header reads it on the same commit to fly the mark from there into the
 * corner (`ui/Travel`). Read once: a box left over from an earlier departure
 * would send the mark from somewhere it no longer is.
 */
export interface Departure {
	rect: DOMRect;
	fontSize: number;
}

let departed: Departure | null = null;

export function takeDeparture(): Departure | null {
	const departure = departed;
	departed = null;
	return departure;
}

/**
 * Records the element's box as it unmounts. The cleanup runs before React
 * takes the node out of the document, so it can still be measured.
 */
export function useDeparture(element: RefObject<HTMLElement | null>) {
	useLayoutEffect(() => {
		const node = element.current;
		return () => {
			if (!node?.isConnected) return;
			departed = {
				rect: node.getBoundingClientRect(),
				fontSize: parseFloat(getComputedStyle(node).fontSize),
			};
		};
	}, [element]);
}
