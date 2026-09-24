import { libraryCount } from '../api/library';
import { COPY } from '../copy';
import { useAsync } from '../lib/useAsync';
import { SETTLE, useSettle } from './settle';

/**
 * What Scribe is, and how much it reads from, in one line under the wordmark
 * — the home screen's alone, never the mark's, so it stays behind when the
 * mark travels to the header.
 *
 * The claim is set as a line of the prose, in the reading face and its light
 * weight, and lower case like the mark it belongs to. The count closes the
 * same line a size down and fainter, with its number set apart: the claim is
 * what Scribe is, the count is the size of what it is doing it to, and the
 * difference in size is the difference in weight. Not an italic, because an
 * italic here means a book, and not spaced capitals, which read as a label
 * stuck on rather than a line set.
 *
 * One line wide. Narrow it breaks at its comma, so a phone gets two whole
 * phrases, the count riding on the second; only a phone too narrow for a
 * whole phrase breaks one, and then evenly (`text-balance`) rather than
 * leaving a word on a line of its own.
 * The count arrives a beat after the claim, and not at all if the catalogue
 * cannot be reached: a number nobody can vouch for is worse than no number.
 */
export function Subtitle() {
	const claim = useSettle(SETTLE.subtitle);
	const counted = useSettle(SETTLE.library);
	const works = useAsync(() => libraryCount(), []);
	const count = works.value === null ? null : COPY.library(works.value);
	const [first, second] = COPY.subtitle;

	return (
		<p
			className={`font-read text-ink-soft m-0 mt-1.5 text-center text-lede font-light text-balance @max-compact:mt-2 @max-compact:text-prose @max-compact:leading-snug ${claim.className}`}
			style={claim.style}
		>
			<span className="whitespace-nowrap @max-compact:block @max-compact:whitespace-normal">
				{first}
			</span>{' '}
			<span className="whitespace-nowrap @max-compact:block @max-compact:whitespace-normal">
				{second}
				{count && (
					<span
						className={`font-app text-small text-ink-faint inline-block ${counted.className}`}
						style={counted.style}
					>
						&nbsp;{count.before}
						<span className="font-bold underline underline-offset-2">
							{count.count}
						</span>
						{count.after}
					</span>
				)}
			</span>
		</p>
	);
}
