import { COPY } from '../copy';
import { useElapsed } from './useElapsed';

/** Long enough that the silence is worth explaining, short enough to reassure. */
const CLOCK_AFTER = 8;

/**
 * The line that says the turn is alive while nothing else on screen moves:
 * before the model has said anything, and between its steps, while it reads
 * what came back and decides what to do next. On a phone that gap was a list
 * of finished steps and nothing under it, which read as a stall.
 *
 * A turning ring, as Claude, ChatGPT and Gemini all show one, because motion
 * that never stops is the one signal that the stream is still open. It turns
 * on transform alone, so a phone composites it without laying anything out,
 * and it holds still under reduced motion, where the clock does the telling.
 *
 * The cheap models are the slow ones: minutes can pass between steps. At that
 * length an animation alone is not a loading state — it is indistinguishable
 * from a page that has hung — so past eight seconds a running clock says how
 * long this stretch has been. Keyed by the caller on the step count, it
 * restarts when the model does something new. Tabular, so the digits do not
 * shuffle the line sideways every second.
 */
export function Waiting({
	label = COPY.thinking,
	className = 'mb-3',
}: {
	label?: string;
	className?: string;
}) {
	const seconds = useElapsed();

	return (
		<p
			className={`font-app text-small text-ink-soft flex items-center gap-2 ${className}`}
		>
			<span
				aria-hidden="true"
				className="border-edge border-t-ink-soft size-3 shrink-0 animate-spin rounded-full border-[1.5px] motion-reduce:animate-none"
			/>
			<span aria-live="polite">{label}</span>
			{seconds >= CLOCK_AFTER && (
				// Out of the live region: a screen reader does not want to be
				// told the time once a second.
				<span
					aria-hidden="true"
					className="text-ink-faint tabular-nums"
				>
					{COPY.waiting(seconds)}
				</span>
			)}
		</p>
	);
}
