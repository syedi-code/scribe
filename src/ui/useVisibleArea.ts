import { useEffect, type RefObject } from 'react';

/**
 * A modal is placed against the layout viewport, but on a phone the keyboard,
 * the browser's toolbar or a pinch of zoom can cover its bottom — and a sheet
 * pinned there, its one button with it. The visual viewport is what is really
 * showing: the sheet is lifted by `--hidden-below` and capped at
 * `--seen-height`.
 */
export function useVisibleArea(element: RefObject<HTMLElement | null>) {
	useEffect(() => {
		const seen = window.visualViewport;
		const target = element.current;
		if (!seen || !target) return;

		const measure = () => {
			const hiddenBelow = Math.max(
				0,
				window.innerHeight - (seen.offsetTop + seen.height)
			);
			target.style.setProperty('--hidden-below', `${hiddenBelow}px`);
			target.style.setProperty('--seen-height', `${seen.height}px`);
		};

		measure();
		seen.addEventListener('resize', measure);
		seen.addEventListener('scroll', measure);
		return () => {
			seen.removeEventListener('resize', measure);
			seen.removeEventListener('scroll', measure);
		};
	}, [element]);
}
