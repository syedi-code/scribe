import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COPY } from '../copy';
import { ChatContext } from '../chat/context';
import { FlagContext } from '../flags/context';
import { DEFAULT_FLAGS } from '../flags/flags';
import { ModelContext } from '../models/context';
import { setDraft } from '../state/draft';
import { chat, models, stubFetch } from '../test/harness';
import { Composer } from './Composer';

/** Typing `@` to name a book (#51), behind its flag. */

const WORKS = [
	{
		work_id: 'bge',
		title: 'Beyond Good and Evil',
		creator: 'Friedrich Nietzsche',
		originally_published: null,
		documents: [],
	},
	{
		work_id: 'cpr',
		title: 'Critique of Pure Reason',
		creator: 'Immanuel Kant',
		originally_published: null,
		documents: [],
	},
];

function setUp(enabled = true) {
	const ask = vi.fn();
	render(
		<FlagContext
			value={{
				flags: { ...DEFAULT_FLAGS, isBookMentionEnabled: enabled },
				loading: false,
			}}
		>
			<ModelContext value={models}>
				<ChatContext value={chat({ ask })}>
					<Composer />
				</ChatContext>
			</ModelContext>
		</FlagContext>
	);
	const field = screen.getByLabelText(
		COPY.askPlaceholder
	) as HTMLTextAreaElement;
	const type = (value: string) => {
		fireEvent.change(field, { target: { value } });
		field.setSelectionRange(value.length, value.length);
		fireEvent.select(field);
	};
	return { ask, field, type };
}

describe('naming a book with @', () => {
	beforeEach(() => stubFetch({ works: WORKS }));
	afterEach(() => {
		act(() => setDraft(''));
		vi.unstubAllGlobals();
	});

	it('offers the books a mention could mean, and takes one with Enter', async () => {
		const { ask, field, type } = setUp();
		type('What does @kan');
		const option = await screen.findByRole('option', {
			name: /Critique of Pure Reason/,
		});
		expect(option.getAttribute('aria-selected')).toBe('true');
		expect(field.getAttribute('aria-expanded')).toBe('true');

		fireEvent.keyDown(field, { key: 'Enter' });
		expect(field.value).toBe('What does Critique of Pure Reason ');
		// Enter took the book; it did not send the half-written question.
		expect(ask).not.toHaveBeenCalled();
		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('moves with the arrows and takes a row pressed', async () => {
		const { field, type } = setUp();
		type('@');
		await screen.findAllByRole('option');
		fireEvent.keyDown(field, { key: 'ArrowDown' });
		expect(
			screen
				.getByRole('option', { name: /Critique of Pure Reason/ })
				.getAttribute('aria-selected')
		).toBe('true');

		fireEvent.pointerDown(
			screen.getByRole('option', { name: /Beyond Good and Evil/ })
		);
		expect(field.value).toBe('Beyond Good and Evil ');
	});

	it('puts the menu away on Escape, and sends as usual after', async () => {
		const { ask, field, type } = setUp();
		type('Is @bey');
		await screen.findByRole('listbox');
		fireEvent.keyDown(field, { key: 'Escape' });
		expect(screen.queryByRole('listbox')).toBeNull();
		fireEvent.keyDown(field, { key: 'Enter' });
		expect(ask).toHaveBeenCalledWith('Is @bey');
	});

	it('says so when the library holds nothing by that name', async () => {
		const { type } = setUp();
		type('@zarathustra');
		expect(await screen.findByText(COPY.mention.none)).toBeTruthy();
	});

	it('leaves an email address alone', async () => {
		const { type } = setUp();
		type('write to me@kant');
		await act(async () => {});
		expect(screen.queryByRole('listbox')).toBeNull();
	});

	it('does nothing while its flag is off', async () => {
		const { field, type } = setUp(false);
		type('@kan');
		await act(async () => {});
		expect(screen.queryByRole('listbox')).toBeNull();
		expect(field.getAttribute('role')).toBeNull();
	});
});
