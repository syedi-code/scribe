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

const TURN_MS = 8000;

/** The block the reader's pointer rests on, which holds the hand where it is. */
const block = () =>
	screen.getAllByRole('button')[1].parentElement!.parentElement!;

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
			expect(screen.getByText(suggestion.work)).toBeTruthy();
		}
	});

	it('deals the whole library before any question comes round again', () => {
		vi.useFakeTimers();
		stubFetch(LIBRARY);
		renderApp(<Home composerSlot={() => {}} />);

		// Twenty-five questions, three at a time: eight hands come off one
		// shuffle, and none of the twenty-four repeats.
		const dealt = showing();
		for (let turn = 1; turn < 8; turn++) {
			act(() => vi.advanceTimersByTime(TURN_MS));
			dealt.push(...showing());
		}

		expect(dealt).toHaveLength(24);
		expect(new Set(dealt).size).toBe(24);
	});

	it('holds the hand while a reader is reading it', () => {
		vi.useFakeTimers();
		stubFetch(LIBRARY);
		renderApp(<Home composerSlot={() => {}} />);
		const before = showing();

		fireEvent.mouseEnter(block());
		act(() => vi.advanceTimersByTime(TURN_MS * 3));
		expect(showing()).toEqual(before);

		fireEvent.mouseLeave(block());
		act(() => vi.advanceTimersByTime(TURN_MS));
		expect(showing()).not.toEqual(before);
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
		expect(line.className).toContain('z-20');

		// Every other child of the column sits at the default level, so the
		// explicit one wins however the DOM is ordered.
		for (const child of column.children) {
			if (child !== line) expect(child.className).not.toMatch(/\bz-\d/);
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
