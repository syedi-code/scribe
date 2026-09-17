import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { assistant, renderApp, stubFetch } from '../test/harness';
import { Turn } from './Turn';

/**
 * A turn that searched, read, and then stopped.
 *
 * alexandria ran out of steps in the middle of a tool call in production and
 * saved an answer with no answer in it. The reader was shown everything the
 * model had read and nothing underneath it, with no way to ask again. The
 * server now writes on its last step; this is what is said if it ever does
 * not.
 */
const read = (): Parameters<typeof assistant>[0] => [
	{ type: 'step-start' },
	{
		type: 'tool-read_pages',
		toolCallId: 'c1',
		state: 'output-available',
		input: { document_id: 'd1', from: 1, to: 2 },
		output: [],
	} as never,
];

describe('a turn that never got to an answer', () => {
	it('says so, rather than showing the work and stopping', () => {
		stubFetch();
		renderApp(
			<Turn
				question="What does Foucault say about Darwin?"
				message={assistant(read())}
				streaming={false}
			/>
		);
		expect(
			screen.getByText('Scribe stopped before it wrote an answer.')
		).toBeTruthy();
	});

	it('offers to ask again', () => {
		stubFetch();
		const onRetry = vi.fn();
		renderApp(
			<Turn
				question="What does Foucault say about Darwin?"
				message={assistant(read())}
				streaming={false}
				onRetry={onRetry}
			/>
		);
		fireEvent.click(screen.getByRole('button', { name: 'Ask again' }));
		expect(onRetry).toHaveBeenCalled();
	});

	it('says nothing while the answer is still being written', () => {
		stubFetch();
		renderApp(
			<Turn
				question="What does Foucault say about Darwin?"
				message={assistant(read())}
				streaming
			/>
		);
		expect(
			screen.queryByText('Scribe stopped before it wrote an answer.')
		).toBeNull();
	});

	it('says nothing when there is an answer', () => {
		stubFetch();
		renderApp(
			<Turn
				question="What does Foucault say about Darwin?"
				message={assistant([
					...read(),
					{ type: 'step-start' },
					{
						type: 'text',
						text: 'Foucault says the epistemes shift.',
					},
				])}
				streaming={false}
			/>
		);
		expect(
			screen.queryByText('Scribe stopped before it wrote an answer.')
		).toBeNull();
		expect(
			screen.getByText(/Foucault says the epistemes shift/)
		).toBeTruthy();
	});
});
