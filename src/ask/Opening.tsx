import { Wordmark } from '../ui/Wordmark';
import { useArrival } from './settle';

/**
 * The wordmark, written out a letter at a time. Nothing else on the column
 * appears until it says it has finished.
 */
export function Opening() {
	const { reduced, announce } = useArrival();

	return (
		<Wordmark
			typing={!reduced}
			onTyped={announce}
			className="text-[clamp(2.4rem,6.5vw,3.3rem)] @max-compact:text-[2.4rem]"
		/>
	);
}
