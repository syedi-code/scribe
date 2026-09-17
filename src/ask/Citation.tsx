import { useCitedPage } from '../citations/useCitedPage';
import { openPage } from '../state/reader';
import { Stamp } from './Stamp';
import type { AnswerCitation } from '../api/types';

/**
 * The evidence, in the prose.
 *
 * Quoted words are set one weight heavier than the light face around them and
 * the quotation marks drop back to a faint grey, so the source's words carry
 * the mark rather than a rule under them. Underlining was the first treatment
 * and it was too loud: a twenty-word quote under a coloured rule pulls the eye
 * off the sentence it is supporting.
 */
export function Citation({
	index,
	quote,
	citation,
	lit,
	onLight,
	onAnchor,
}: {
	index: number;
	quote: string;
	citation: AnswerCitation | null;
	lit: boolean;
	onLight: (index: number | null) => void;
	onAnchor: (index: number, element: HTMLElement | null) => void;
}) {
	const { page } = useCitedPage(citation);
	const open = (element: HTMLElement) =>
		citation && openPage(citation, element);

	return (
		<span
			ref={(element) => onAnchor(index, element)}
			role="button"
			tabIndex={0}
			aria-disabled={!citation}
			onClick={(event) => open(event.currentTarget)}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					open(event.currentTarget);
				}
			}}
			onMouseEnter={() => onLight(index)}
			onMouseLeave={() => onLight(null)}
			onFocus={() => onLight(index)}
			onBlur={() => onLight(null)}
			className={`group/cite quote-mark hover:bg-bubble cursor-pointer rounded-[3px] font-normal transition-colors duration-200 ${
				lit ? 'bg-bubble' : ''
			}`}
		>
			<span className="text-ink-faint font-light">“</span>
			{quote}
			<span className="text-ink-faint font-light">”</span>
			<Stamp citation={citation} page={page} />
		</span>
	);
}
