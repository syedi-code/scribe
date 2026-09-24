import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

/** How close to the end still counts as being at it. */
const NEAR = 120;

/**
 * A chat follows its own tail, unless the reader has scrolled up to look at
 * something — in which case it stays where they put it.
 *
 * `follow` is the reader asking to be taken to the end: it changes when they
 * send a question or open a conversation, and whatever they were reading,
 * the page goes to the bottom and sticks there again (#50).
 *
 * Only a scroll the reader made can unstick it. On a phone the keyboard
 * opening or closing resizes the viewport and fires a scroll of its own, and
 * measured then, the end had jumped past `NEAR` with nobody touching it: so a
 * scroll that comes with a change of height is the viewport, not the reader.
 * And the end is held while it is still moving — a face landing, the composer
 * resizing, the keyboard animating — rather than scrolled to once against a
 * height that is about to change.
 */
export function useStickToBottom(
	ref: RefObject<HTMLElement | null>,
	deps: readonly unknown[],
	follow: unknown
) {
	const stuck = useRef(true);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		let height = element.clientHeight;
		const onScroll = () => {
			if (element.clientHeight !== height) {
				height = element.clientHeight;
				return;
			}
			stuck.current =
				element.scrollHeight -
					element.scrollTop -
					element.clientHeight <
				NEAR;
		};
		element.addEventListener('scroll', onScroll, { passive: true });
		return () => element.removeEventListener('scroll', onScroll);
	}, [ref]);

	useLayoutEffect(() => {
		stuck.current = true;
	}, [follow]);

	// The content is remounted when the conversation changes, so what is
	// watched is found again each time the reader is taken to the end.
	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		const hold = () => {
			if (stuck.current) element.scrollTop = element.scrollHeight;
		};
		const watch = new ResizeObserver(hold);
		watch.observe(element);
		for (const child of element.children) watch.observe(child);
		return () => watch.disconnect();
	}, [ref, follow]);

	useLayoutEffect(() => {
		const element = ref.current;
		if (element && stuck.current) element.scrollTop = element.scrollHeight;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [...deps, follow]);
}
