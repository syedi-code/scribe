import { act, render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelContext } from '../models/context';
import { models, thread } from '../test/harness';
import { ChatProvider } from './ChatProvider';
import { forgetChats } from './chats';
import { useConversation, type ChatState } from './context';
import { forgetThread } from './threads';
import type { ScribeMessage } from './message';

/**
 * An answer streaming in one conversation while the reader opens another.
 *
 * There was one chat for the whole app, and a stream still running wrote
 * into it whatever was on screen: every part that arrived took the page back
 * to the conversation being answered (#72).
 */

const said = (id: string, role: 'user' | 'assistant', text: string) =>
	({ id, role, parts: [{ type: 'text', text }] }) as ScribeMessage;

const OLD = [
	said('b1', 'user', 'An old question'),
	said('b2', 'assistant', 'An old answer'),
];

/** A stream the test writes into, a part at a time. */
function openStream() {
	let push!: (chunk: object | '[DONE]') => void;
	let close!: () => void;
	const body = new ReadableStream<Uint8Array>({
		start(controller) {
			const encode = new TextEncoder();
			push = (chunk) =>
				controller.enqueue(
					encode.encode(
						`data: ${chunk === '[DONE]' ? chunk : JSON.stringify(chunk)}\n\n`
					)
				);
			close = () => controller.close();
		},
	});
	return {
		body,
		push: (chunk: object | '[DONE]') => push(chunk),
		close: () => close(),
	};
}

let seen: ChatState;
const report = (state: ChatState) => {
	seen = state;
};
function Probe() {
	const state = useConversation();
	useEffect(() => report(state));
	return null;
}

const texts = () =>
	seen.messages.map((message) =>
		message.parts
			.map((part) => (part.type === 'text' ? part.text : ''))
			.join('')
	);

describe('an answer streaming while another conversation is opened', () => {
	let stream: ReturnType<typeof openStream>;

	beforeEach(() => {
		stream = openStream();
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = String(input);
				const method = init?.method ?? 'GET';
				if (url.endsWith('/conversations') && method === 'POST')
					return Response.json({ conversation: thread('a', null) });
				if (url.endsWith('/conversations/a/chat'))
					return new Response(stream.body, {
						headers: { 'content-type': 'text/event-stream' },
					});
				if (url.endsWith('/conversations/b'))
					return Response.json({
						conversation: thread('b', 'An old one'),
						messages: OLD,
					});
				if (url.endsWith('/conversations/a'))
					return Response.json({ conversation: thread('a', null) });
				return Response.json({
					conversations: [thread('b', 'An old one')],
				});
			})
		);
		render(
			<ModelContext value={models}>
				<ChatProvider>
					<Probe />
				</ChatProvider>
			</ModelContext>
		);
	});

	afterEach(() => {
		forgetChats();
		forgetThread('a');
		forgetThread('b');
		vi.unstubAllGlobals();
	});

	it('stays on the conversation opened, and keeps the answer for its own', async () => {
		act(() => seen.ask('A new question'));
		await waitFor(() => expect(seen.status).toBe('submitted'));
		act(() => {
			stream.push({ type: 'start', messageId: 'a2' });
			stream.push({ type: 'start-step' });
			stream.push({ type: 'text-start', id: 't' });
			stream.push({ type: 'text-delta', id: 't', delta: 'The first ' });
		});
		await waitFor(() => expect(texts().at(-1)).toBe('The first '));

		act(() => seen.openThread('b'));
		await waitFor(() =>
			expect(texts()).toEqual(['An old question', 'An old answer'])
		);

		// The answer goes on arriving, and the page stays where the reader put it.
		await act(async () => {
			stream.push({
				type: 'text-delta',
				id: 't',
				delta: 'and the rest.',
			});
			stream.push({ type: 'text-end', id: 't' });
			stream.push({ type: 'finish-step' });
			stream.push({ type: 'finish' });
			stream.push('[DONE]');
			stream.close();
			await new Promise((settle) => setTimeout(settle, 20));
		});
		expect(seen.activeId).toBe('b');
		expect(texts()).toEqual(['An old question', 'An old answer']);
		expect(seen.busy).toBe(false);

		// Back to the first, the answer is there in full.
		act(() => seen.openThread('a'));
		expect(texts()).toEqual(['A new question', 'The first and the rest.']);
	});
});
