import { COPY } from '../copy';
import { SETTLE, useSettle } from './settle';

/**
 * What Scribe is, in one line under the wordmark — the home screen's alone,
 * never the mark's, so it stays behind when the mark travels to the header.
 *
 * Set as a line of the prose, in the reading face and its light weight, and
 * lower case like the mark it belongs to. It sits close under the mark, as one
 * lockup with it, and the running line keeps its distance below: the subtitle
 * is what Scribe is, the running line is what it is doing now. Not an italic,
 * because an italic here means a book, and not spaced capitals, which read as
 * a label stuck on rather than a line set.
 *
 * One line wide. Narrow it breaks at its comma, never wherever it ran out of
 * room, so a phone gets two whole phrases.
 */
export function Subtitle() {
	const settle = useSettle(SETTLE.subtitle);

	return (
		<p
			className={`font-read text-ink-soft m-0 mt-1.5 text-center text-lede font-light @max-compact:mt-2 @max-compact:text-prose @max-compact:leading-snug ${settle.className}`}
			style={settle.style}
		>
			{COPY.subtitle.map((phrase, at) => (
				<span
					key={phrase}
					className="whitespace-nowrap @max-compact:block"
				>
					{at > 0 && ' '}
					{phrase}
				</span>
			))}
		</p>
	);
}
