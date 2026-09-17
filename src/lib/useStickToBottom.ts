import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

/**
 * A chat follows its own tail, unless the reader has scrolled up to look at
 * something — in which case it stays where they put it.
 */
const NEAR = 120;

export function useStickToBottom(
	ref: RefObject<HTMLElement | null>,
	deps: readonly unknown[]
) {
	const stuck = useRef(true);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		const onScroll = () => {
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
		const element = ref.current;
		if (element && stuck.current) element.scrollTop = element.scrollHeight;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps);
}
