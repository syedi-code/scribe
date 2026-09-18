import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
	assistant,
	asProduction,
	renderApp,
	stubFetch,
	verified,
} from '../test/harness';
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

/**
 * A title and a surname in the prose came from `citation.page`, which
 * production has never sent. Every fixture set it, so every test passed while
 * the reading surface showed neither. The document behind the `ref` is the
 * fallback the margin already used.
 */
describe('a cited work, when the server sends no page', () => {
	const answered = () =>
		assistant(
			[
				{ type: 'step-start' },
				{
					type: 'text',
					text: 'Nietzsche calls it Beyond Good and Evil [P1 "the will to truth"].',
				},
			],
			[
				asProduction({
					...verified('P1', 'the will to truth'),
					ref: { document_id: 'doc-prose', page_no: 21 },
				}),
			]
		);

	const document = {
		document: {
			document_id: 'doc-prose',
			work_id: 'w1',
			work_title: 'Beyond Good and Evil',
			creator: 'Friedrich Nietzsche',
			page_count: 300,
			page_offset: 12,
			has_file: true,
		},
	};

	// The name is also printed in the margin and on the shelf; this is about
	// the prose, which is the surface that was showing neither.
	const prose = async () =>
		await waitFor(() => {
			const found = window.document.querySelector('.text-prose');
			expect(found?.querySelector('cite')).toBeTruthy();
			return found as HTMLElement;
		});

	it('still inks the surname in the prose', async () => {
		stubFetch(document);
		renderApp(
			<Turn
				question="What does Nietzsche say?"
				message={answered()}
				streaming={false}
			/>
		);

		const name = within(await prose()).getByText('Nietzsche');
		expect(name.className).toMatch(/author-c[0-5]/);
	});

	it('still sets the work as a title in the prose', async () => {
		stubFetch(document);
		renderApp(
			<Turn
				question="What does Nietzsche say?"
				message={answered()}
				streaming={false}
			/>
		);

		const title = within(await prose()).getByText('Beyond Good and Evil');
		expect(title.tagName).toBe('CITE');
		expect(title.className).toContain('work-title');
	});
});
