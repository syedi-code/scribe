import { COPY } from '../copy';
import { SETTLE, useSettle } from './settle';

/**
 * What Scribe is, in one line under the wordmark — the home screen's alone,
 * never the mark's, so it stays behind when the mark travels to the header.
 *
 * Spaced capitals rather than an italic, because an italic here means a book.
 * Two stacked phrases on every screen, broken at the comma: one line ran
 * twice the width of the mark it sits under, and a phone would have broken it
 * wherever it ran out. The trailing tracking is taken back on the right so the
 * line is centred on its letters rather than on its last gap.
 */
export function Subtitle() {
	const settle = useSettle(SETTLE.subtitle);

	return (
		<p
			className={`font-app text-ui text-ink-soft m-0 mt-3 mr-[-0.2em] text-center leading-[1.75] tracking-[0.2em] uppercase @max-compact:text-small @max-compact:mr-[-0.18em] @max-compact:tracking-[0.18em] ${settle.className}`}
			style={settle.style}
		>
			{COPY.subtitle.map((phrase, at) => (
				<span key={phrase} className="block whitespace-nowrap">
					{at > 0 && <span className="sr-only"> </span>}
					{phrase}
				</span>
			))}
		</p>
	);
}
