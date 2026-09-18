import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
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

	it('gives every citation a stamp naming its verdict and page', () => {
		renderAnswer('Nietzsche says as much [P1 "the will to truth"].', [
			verified('P1', 'the will to truth'),
		]);
		const stamp = screen.getByRole('img');
		expect(stamp.getAttribute('aria-label')).toContain('found on the page');
		expect(stamp.getAttribute('aria-label')).toContain(
			'Beyond Good and Evil'
		);
	});
});
