import { describe, expect, it } from 'vitest';
import { renderApp, stubFetch, verified } from '../test/harness';
import { alignCitations, markersFor, segmentAnswer } from '../citations/parse';
import { Answer } from './Answer';

/**
 * The answer as a reader sees it.
 *
 * The regression these exist for: on production the model wrote the passage
 * out in its own prose and then cited a few words of it, and the interface
 * printed the same sentence twice running.
 */

function renderAnswer(text: string, citations = [verified('P1', 'a quote')]) {
	stubFetch();
	const markers = markersFor(text, citations);
	return renderApp(
		<Answer
			blocks={segmentAnswer(text, markers)}
			citations={alignCitations(markers, citations)}
			resolved={markers.length}
			streaming={false}
			lit={null}
			onLight={() => {}}
			onAnchor={() => {}}
		/>
	);
}

const QUOTE =
	'that unconditional will to truth, is faith in the ascetic ideal itself';

describe('an answer that quotes and then cites the same words', () => {
	const text = `He writes: "However, the compulsion towards it, ${QUOTE}, even if as an unconscious imperative" [P1 "${QUOTE}"]. That is his claim.`;

	it('prints the passage once', () => {
		renderAnswer(text, [verified('P1', QUOTE)]);
		const shown = document.body.textContent ?? '';
		const occurrences = shown.split(QUOTE).length - 1;
		expect(occurrences).toBe(1);
	});

	it('leaves no citation marker in the prose', () => {
		renderAnswer(text, [verified('P1', QUOTE)]);
		expect(document.body.textContent).not.toContain('[P1');
	});

	it('sets only the checked words one weight heavier', () => {
		renderAnswer(text, [verified('P1', QUOTE)]);
		const heavier = document.querySelector('.font-normal');
		expect(heavier?.textContent).toBe(QUOTE);
	});

	it('keeps the rest of the sentence around it', () => {
		renderAnswer(text, [verified('P1', QUOTE)]);
		expect(document.body.textContent).toContain('He writes:');
		expect(document.body.textContent).toContain('That is his claim.');
	});
});

describe('an answer that cites without quoting first', () => {
	it('prints the quotation from the citation', () => {
		renderAnswer('Nietzsche says as much [P1 "the will to truth"].', [
			verified('P1', 'the will to truth'),
		]);
		expect(document.body.textContent).toContain('the will to truth');
		expect(document.body.textContent).not.toContain('[P1');
	});

	// The verdict is a rule under the checked words, so it says which words
	// were checked and not merely that something was. Colour alone would be
	// no verdict at all in print or to a reader who cannot separate the two
	// inks, so the rule carries a style as well.
	it('draws the verdict under the words that were checked', () => {
		renderAnswer('Nietzsche says as much [P1 "the will to truth"].', [
			verified('P1', 'the will to truth'),
		]);
		const checked = document.querySelector('.font-normal');
		expect(checked?.textContent).toBe('the will to truth');
		expect(checked?.className).toContain('underline');
		expect(checked?.className).toContain('decoration-verdigris');
	});

	// The square said the verdict in words to a screen reader. It is gone;
	// the words are not.
	it('still says the verdict and the page in words', () => {
		renderAnswer('Nietzsche says as much [P1 "the will to truth"].', [
			verified('P1', 'the will to truth'),
		]);
		expect(document.body.textContent).toContain('found on the page');
		expect(document.body.textContent).toContain('Beyond Good and Evil');
	});
});
