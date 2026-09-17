import { useEffect, type RefObject } from 'react';

/**
 * A pointer outside, or Escape: the two ways anything transient is dismissed.
 *
 * The event goes to the caller, because the control that opened a panel is
 * itself outside it — and closing on its pointerdown, only to reopen on the
 * same tap's click, is a panel that cannot be shut.
 */
export function useDismiss(
	ref: RefObject<HTMLElement | null>,
	open: boolean,
	dismiss: (event: Event) => void
) {
	useEffect(() => {
		if (!open) return;
		const onPointerDown = (event: PointerEvent) => {
			if (!ref.current?.contains(event.target as Node)) dismiss(event);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') dismiss(event);
		};
		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [ref, open, dismiss]);
}
