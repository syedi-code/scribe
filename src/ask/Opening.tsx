import { useRef } from 'react';
import { Wordmark } from '../ui/Wordmark';
import { useDeparture } from '../ui/departure';
import { useArrival } from './settle';

/**
 * The wordmark, written out a letter at a time. Nothing else on the column
 * appears until it says it has finished. When the home screen goes, it says
 * where it was, so the header can carry it into the corner.
 */
export function Opening() {
	const { reduced, announce } = useArrival();
	const mark = useRef<HTMLDivElement>(null);
	useDeparture(mark);

	return (
		<div
			ref={mark}
			className="text-[clamp(2.4rem,6.5vw,3.3rem)] @max-compact:text-[2.4rem]"
		>
			<Wordmark typing={!reduced} onTyped={announce} />
		</div>
	);
}
