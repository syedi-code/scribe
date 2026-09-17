import { useEffect, type RefObject } from 'react';

/** A pointer outside, or Escape: the two ways anything transient is dismissed. */
export function useDismiss(
	ref: RefObject<HTMLElement | null>,
	open: boolean,
	dismiss: () => void
) {
	useEffect(() => {
		if (!open) return;
		const onPointerDown = (event: PointerEvent) => {
			if (!ref.current?.contains(event.target as Node)) dismiss();
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') dismiss();
		};
		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [ref, open, dismiss]);
}
