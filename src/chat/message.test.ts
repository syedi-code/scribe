import { describe, expect, it } from 'vitest';
import { readMessage, type ScribeMessage } from './message';

/**
 * What the apparatus shows, and what it refuses to show.
 *
 * The regression these exist for: the steps flashed in and out while the model
 * worked, because narration was being rendered alongside the tool calls and
 * rewritten every time the model changed its mind.
 */

const message = (parts: ScribeMessage['parts']): ScribeMessage => ({
	id: 'm1',
	role: 'assistant',
	parts,
});

// The SDK's part union is narrower than a test needs to be; what readMessage
// looks at is the shape, not the brand.
const search = (query: string, output?: unknown) =>
	({
		type: 'tool-search_pages',
		toolCallId: `s:${query}`,
		state: output ? 'output-available' : 'input-available',
		input: { query },
		output,
	}) as unknown as ScribeMessage['parts'][number];

describe('readMessage', () => {
	it('takes the answer from after the last step boundary', () => {
		const read = readMessage(
			message([
				{ type: 'step-start' },
				{ type: 'text', text: 'Let me search for that.' },
				{ type: 'step-start' },
				{ type: 'text', text: 'Nietzsche does not.' },
			]),
			false
		);
		expect(read.answer).toBe('Nietzsche does not.');
	});

	it('keeps narration out of the apparatus entirely', () => {
		const read = readMessage(
			message([
				{ type: 'step-start' },
				{ type: 'text', text: 'Let me read the fuller context.' },
				search('will to truth'),
				{ type: 'step-start' },
				{ type: 'text', text: 'The answer.' },
			]),
			true
		);
		expect(read.work).toHaveLength(1);
		expect(JSON.stringify(read.work)).not.toContain('fuller context');
	});

	it('keeps a step once it has happened, and records what came back', () => {
		const output = [
			{ work_id: 'w1', ref: { document_id: 'd1', page_no: 21 } },
			{ work_id: 'w2', ref: { document_id: 'd2', page_no: 9 } },
		];
		const read = readMessage(
			message([
				{ type: 'step-start' },
				search('will to truth', output),
				search('value of truth'),
			]),
			true
		);
		expect(read.work.map((step) => step.state)).toEqual([
			'done',
			'running',
		]);
		expect(read.work[0].result).toBe('2 pages in 2 works');
		expect(read.work[0].subject).toContain('will to truth');
	});

	it('leaves nothing running once the stream is closed', () => {
		const read = readMessage(
			message([{ type: 'step-start' }, search('will to truth')]),
			false
		);
		expect(read.work[0].state).toBe('done');
	});

	it('says when a tool call failed, and why', () => {
		const read = readMessage(
			message([
				{ type: 'step-start' },
				{
					type: 'tool-read_pages',
					toolCallId: 'r1',
					state: 'output-error',
					input: { document_id: 'Genealogy', from: 146, to: 147 },
					errorText: 'No such document',
				} as unknown as ScribeMessage['parts'][number],
			]),
			true
		);
		expect(read.work[0].state).toBe('failed');
		expect(read.work[0].result).toBe('No such document');
	});

	it('reports the model that wrote the answer', () => {
		const read = readMessage(
			{
				id: 'm2',
				role: 'assistant',
				metadata: { model_id: 'claude-opus-5' },
				parts: [{ type: 'text', text: 'An answer.' }],
			},
			false
		);
		expect(read.modelId).toBe('claude-opus-5');
	});
});
