import { render } from '@testing-library/react';
import { vi } from 'vitest';
import type { ReactElement } from 'react';
import { ChatContext, type ChatState } from '../chat/context';
import { ModelContext, type ModelState } from '../models/context';
import type { AnswerCitation, Conversation } from '../api/types';
import type { ScribeMessage } from '../chat/message';

/** A chat and a model roster, stood up without a network. */
export const models: ModelState = {
	choices: [
		{
			id: 'claude-haiku-4-5-20251001',
			label: 'Claude Haiku 4.5',
			provider: 'anthropic',
			acceptsFiles: true,
			available: true,
			suspended: false,
		},
		{
			id: 'gpt-5.5',
			label: 'GPT-5.5',
			provider: 'openai',
			acceptsFiles: true,
			available: false,
			suspended: false,
		},
	],
	selected: {
		id: 'claude-haiku-4-5-20251001',
		label: 'Claude Haiku 4.5',
		provider: 'anthropic',
		acceptsFiles: true,
		available: true,
		suspended: false,
	},
	select: () => {},
	labelFor: () => 'Claude Haiku 4.5',
	loading: false,
};

export const thread = (id: string, title: string | null): Conversation => ({
	id,
	user_id: 'u1',
	title,
	model_id: 'claude-haiku-4-5-20251001',
	created_at: '2026-09-17T00:00:00.000Z',
	updated_at: '2026-09-17T00:00:00.000Z',
});

export const chat = (over: Partial<ChatState> = {}): ChatState => ({
	threads: [],
	naming: [],
	activeId: null,
	messages: [],
	status: 'ready',
	error: undefined,
	failure: null,
	atHome: true,
	busy: false,
	ask: () => {},
	openThread: () => {},
	warmThread: () => {},
	newQuestion: () => {},
	stop: () => {},
	retry: () => {},
	...over,
});

export function renderApp(
	ui: ReactElement,
	{
		state = chat(),
		roster = models,
	}: { state?: ChatState; roster?: ModelState } = {}
) {
	return render(
		<ModelContext value={roster}>
			<ChatContext value={state}>{ui}</ChatContext>
		</ModelContext>
	);
}

/** Nothing in a test reaches the network; anything that tries gets nothing. */
export function stubFetch(body: unknown = {}) {
	const fetcher = vi.fn(async () => ({
		ok: true,
		status: 200,
		json: async () => body,
	}));
	vi.stubGlobal('fetch', fetcher);
	return fetcher;
}

export const assistant = (
	parts: ScribeMessage['parts'],
	citations?: AnswerCitation[]
): ScribeMessage => ({
	id: 'a1',
	role: 'assistant',
	metadata: { model_id: 'claude-haiku-4-5-20251001' },
	parts: citations
		? [...parts, { type: 'data-citations', data: citations }]
		: parts,
});

export const verified = (handle: string, quote: string): AnswerCitation => ({
	handle,
	quote,
	ref: { document_id: 'doc-1', page_no: 21 },
	status: 'verified',
	page: {
		work_id: 'w1',
		work_title: 'Beyond Good and Evil',
		creator: 'Friedrich Nietzsche',
		printed_page: '9',
		document_id: 'doc-1',
		page_no: 21,
		viewable: true,
	},
});
