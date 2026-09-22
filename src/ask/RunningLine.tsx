import { libraryCount } from '../api/library';
import { COPY } from '../copy';
import { useAsync } from '../lib/useAsync';
import { RunningModel } from '../models/RunningModel';
import { useStanding } from '../state/visitor';
import { SETTLE, useSettle } from './settle';

/**
 * Which model is answering, and how much it has to read.
 *
 * Lifted off the reading surface, because the model menu hangs out of this
 * line over the composer under it — and no higher than `--z-lifted`, so the
 * sessions rail still covers it.
 *
 * The count is the claim the line makes, so it is set apart inside it. The
 * line simply does not appear if the catalogue cannot be reached: a number
 * nobody can vouch for is worse than no number.
 */
export function RunningLine() {
	const settle = useSettle(SETTLE.line);
	const books = useAsync(() => libraryCount(), []);
	const library = books.value === null ? null : COPY.library(books.value);
	// A visitor with no session has no roster to be running one of, and
	// "no models available" would read as a fault rather than as a door.
	const looking = useStanding() === 'none';

	return (
		<div
			className={`relative z-(--z-lifted) mt-6 grid justify-items-center gap-0.5 ${settle.className}`}
			style={settle.style}
		>
			{!looking && <RunningModel hero />}
			{library && (
				<p className="font-app text-small text-ink-faint m-0">
					{library.before}
					<span className="font-bold underline underline-offset-2">
						{library.count}
					</span>
					{library.after}
				</p>
			)}
		</div>
	);
}
