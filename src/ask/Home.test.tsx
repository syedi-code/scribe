import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { COPY } from '../copy';
import { chat, renderApp, stubFetch } from '../test/harness';
import { Apparatus } from './Apparatus';
import { Home } from './Home';
import type { WorkStep } from '../chat/message';

// The catalogue is counted once per tab and kept, so every test in this file
// sees the same library.
const LIBRARY = { works: new Array(105).fill({}) };

/** Which of the pool is on screen right now. */
const showing = () =>
	COPY.suggestions
		.filter((suggestion) => screen.queryByText(suggestion.question))
		.map((suggestion) => suggestion.question);

const MINUTE = 60_000;

afterEach(() => vi.useRealTimers());

describe('the home screen', () => {
	it('offers three questions at a time, and names the work behind each', () => {
		stubFetch(LIBRARY);
		renderApp(<Home composerSlot={() => {}} />);

		expect(COPY.suggestions).toHaveLength(25);
		const questions = showing();
		expect(questions).toHaveLength(COPY.howManySuggestions);

		for (const question of questions) {
			const suggestion = COPY.suggestions.find(
				(candidate) => candidate.question === question
			)!;
			// The name is inked piece by piece and the title is set as a
			// title, so the attribution is several spans rather than one
			// string.
			const title = screen.getByText(suggestion.title);
			expect(title.className).toContain('work-title');
			const attribution = title.parentElement!;
			expect(attribution.textContent).toBe(
				`${suggestion.creator} · ${suggestion.title}`
			);
			// The surname carries its ink here too, so the reader meets the
			// author in the colour the answer will write them in.
			expect(attribution.innerHTML).toContain('author-c');
		}
	});

	// They used to turn over every eight seconds, which moved text about
	// beside the thing a reader was trying to type into.
	it('leaves the questions where they were drawn', () => {
		vi.useFakeTimers();
		stubFetch(LIBRARY);
		renderApp(<Home composerSlot={() => {}} />);
		const drawn = showing();

		act(() => vi.advanceTimersByTime(MINUTE));
		expect(showing()).toEqual(drawn);
	});

	it('asks the question that was clicked', () => {
		stubFetch(LIBRARY);
		const ask = vi.fn();
		renderApp(<Home composerSlot={() => {}} />, { state: chat({ ask }) });
		const question = showing()[0];
		fireEvent.click(screen.getByText(question).closest('button')!);
		expect(ask).toHaveBeenCalledWith(question);
	});

	it('says how much there is to read, with the count set apart', async () => {
		stubFetch(LIBRARY);
		renderApp(<Home composerSlot={() => {}} />);

		const count = await screen.findByText('105');
		expect(count.className).toContain('font-bold');
		expect(count.className).toContain('underline');
		expect(count.parentElement?.textContent).toBe('with 105 works');
	});

	it('stands the model line above the composer, so its menu is not behind it', () => {
		stubFetch(LIBRARY);
		renderApp(<Home composerSlot={() => {}} />);
		fireEvent.click(screen.getByRole('button', { name: /Claude/ }));

		const menu = screen.getByRole('menu');
		const column = menu.closest('.row-span-full')!;
		const line = [...column.children].find((child) =>
			child.contains(menu)
		)!;
		expect(line.className).toContain('z-(--z-lifted)');

		// Every other child of the column sits at the default level, so the
		// explicit one wins however the DOM is ordered.
		for (const child of column.children) {
			if (child !== line) expect(child.className).not.toContain('z-(');
		}
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
