import { COPY } from '../copy';
import { useElapsed } from './useElapsed';

/** Long enough that the silence is worth explaining, short enough to reassure. */
const CLOCK_AFTER = 8;

/**
 * What stands where the answer will be, before the model has said anything.
 *
 * The cheap models are the slow ones: minutes can pass before a first word,
 * and every step of the loop pays it again. At that length an animation alone
 * is not a loading state — it is indistinguishable from a page that has hung.
 * A running clock is the one thing that says the wait is still a wait.
 *
 * The sweep is the same `doing` rule every live line in the app trails, and
 * it animates transform and opacity only, so a phone composites it without
 * laying anything out. The clock is tabular, so the digits do not shuffle the
 * line sideways every second.
 */
export function Waiting() {
	const seconds = useElapsed();

	return (
		<p className="font-app text-small text-ink-soft doing mb-3">
			<span aria-live="polite">{COPY.thinking}</span>
			{seconds >= CLOCK_AFTER && (
				// Out of the live region: a screen reader does not want to be
				// told the time once a second.
				<span
					aria-hidden="true"
					className="text-ink-faint ml-2 tabular-nums"
				>
					{COPY.waiting(seconds)}
				</span>
			)}
		</p>
	);
}
