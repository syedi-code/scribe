import { libraryCount } from '../api/library';
import { COPY } from '../copy';
import { useAsync } from '../lib/useAsync';
import { SETTLE, useSettle } from './settle';

/**
 * How much there is to read, under the subtitle on the home screen.
 *
 * It used to be the second line of a pair, under *running Luna ▾*. The model
 * moved into the composer, where the choice is actually made, and this stayed:
 * the count is not about what Scribe is doing now, it is the size of the thing
 * it is doing it to, so it belongs with the line that says what Scribe is.
 *
 * It sits closer under the subtitle than the running line did, as part of that
 * lockup rather than a statement of its own — but it keeps its own place in
 * the arrival, so the column still settles a line at a time.
 *
 * The count is the claim the line makes, so it is set apart inside it. The
 * line simply does not appear if the catalogue cannot be reached: a number
 * nobody can vouch for is worse than no number.
 */
export function LibraryLine() {
	const settle = useSettle(SETTLE.library);
	const books = useAsync(() => libraryCount(), []);
	const library = books.value === null ? null : COPY.library(books.value);

	if (!library) return null;

	return (
		<p
			className={`font-app text-small text-ink-faint m-0 mt-1.5 text-center ${settle.className}`}
			style={settle.style}
		>
			{library.before}
			<span className="font-bold underline underline-offset-2">
				{library.count}
			</span>
			{library.after}
		</p>
	);
}
