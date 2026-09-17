import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { COPY } from '../copy';
import { renderApp, stubFetch } from '../test/harness';
import { Apparatus } from './Apparatus';
import { Home } from './Home';
import type { WorkStep } from '../chat/message';

// The catalogue is counted once per tab and kept, so every test in this file
// sees the same library.
const LIBRARY = { works: new Array(105).fill({}) };

describe('the home screen', () => {
	it('offers the anchor question and one other, drawn from the library', () => {
		stubFetch(LIBRARY);
		renderApp(<Home composerSlot={() => {}} />);
		const questions = screen
			.getAllByRole('button')
			.map((button) => button.textContent ?? '')
			.filter((text) => text.endsWith('?'));

		expect(questions).toHaveLength(COPY.howManySuggestions);
		expect(questions[0]).toBe(COPY.suggestions[0]);
		expect(COPY.suggestions).toContain(questions[1]);
	});

	it('says how much there is to read', async () => {
		stubFetch(LIBRARY);
		renderApp(<Home composerSlot={() => {}} />);
		expect(await screen.findByText('with 105 works')).toBeTruthy();
	});
});

const step = (over: Partial<WorkStep>): WorkStep => ({
	id: 's1',
	action: 'searched',
	subject: '“will to truth”',
	result: null,
	state: 'running',
	...over,
});

describe('the apparatus', () => {
	it('shows every step while the model is working, and keeps them', () => {
		renderApp(
			<Apparatus
				work={[
					step({
						id: 'a',
						result: '6 pages in 2 works',
						state: 'done',
					}),
					step({ id: 'b', action: 'read', subject: 'PDF pp. 19–23' }),
				]}
				summary="searched once"
				live
			/>
		);
		expect(screen.getByText('6 pages in 2 works')).toBeTruthy();
		expect(screen.getByText('PDF pp. 19–23')).toBeTruthy();
	});

	it('folds into one line once the answer is there, and opens again', () => {
		renderApp(
			<Apparatus
				work={[step({ state: 'done', result: 'nothing' })]}
				summary="searched once, read 5 pages in 1 work"
				live={false}
			/>
		);
		expect(screen.queryByText('nothing')).toBeNull();
		fireEvent.click(screen.getByRole('button'));
		expect(screen.getByText('nothing')).toBeTruthy();
	});

	it('says when a step failed, rather than dropping it', () => {
		renderApp(
			<Apparatus
				work={[
					step({
						action: 'read',
						subject: 'Genealogy',
						result: 'No such document',
						state: 'failed',
					}),
				]}
				summary="searched once"
				live
			/>
		);
		expect(screen.getByText('No such document')).toBeTruthy();
	});
});
