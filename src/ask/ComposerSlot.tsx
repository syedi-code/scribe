import { SETTLE, useSettle } from './settle';

/**
 * Where the composer sits on the home screen. It is an empty box on purpose:
 * `AskPanel` portals the one composer into it, so the same textarea and the
 * same draft move between here and the dock.
 */
export function ComposerSlot({
	slot,
}: {
	slot: (element: HTMLDivElement | null) => void;
}) {
	const settle = useSettle(SETTLE.composer);

	return (
		<div
			ref={slot}
			className={`mt-6 w-full max-w-[30rem] ${settle.className}`}
			style={settle.style}
		/>
	);
}
