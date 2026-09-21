import type { UIMessage } from 'ai';
import { COPY } from '../copy';
import type { Allowance, AnswerCitation } from '../api/types';

/**
 * Reading an assistant message.
 *
 * An assistant message holds the text of *every* step, not only the last, and
 * models narrate between tool calls — *let me read the fuller context* —
 * however firmly the instructions ask them not to. Rendering every text part in
 * sequence shows the reader the model thinking out loud and calls it the
 * answer.
 *
 *     The answer is the text after the final `step-start`.
 *     Everything before it is apparatus.
 *
 * The apparatus is the model's *tool calls*, not its narration. Narration
 * appears and disappears as the model changes its mind about what it is doing,
 * which is the opposite of the reassurance it is supposed to give; a search and
 * a read are facts, and they stay on screen once they have happened.
 */

export type ScribeMessage = UIMessage<
	{ model_id?: string; allowance?: Allowance },
	{ citations: AnswerCitation[] }
>;

type Part = ScribeMessage['parts'][number];

interface ToolPart {
	type: string;
	toolCallId: string;
	state:
		| 'input-streaming'
		| 'input-available'
		| 'output-available'
		| 'output-error';
	input?: unknown;
	output?: unknown;
	errorText?: string;
}

/**
 * One line of the apparatus: what the model did, to what, and what came back.
 * Three columns rather than one sentence, so a reader can scan down a search
 * and see the shape of it.
 */
export interface WorkStep {
	id: string;
	action: string;
	subject: string;
	/** What came back, once it has. */
	result: string | null;
	state: 'running' | 'done' | 'failed';
}

export interface ReadMessage {
	answer: string;
	work: WorkStep[];
	summary: string;
	citations: AnswerCitation[] | undefined;
	modelId: string | undefined;
}

const isText = (part: Part): part is Part & { type: 'text'; text: string } =>
	part.type === 'text';

const isTool = (part: Part): part is Part & ToolPart =>
	part.type.startsWith('tool-');

const toolName = (part: ToolPart) => part.type.slice('tool-'.length);

const ready = (part: ToolPart) => part.state === 'output-available';
const failed = (part: ToolPart) => part.state === 'output-error';

/** Groups parts by the step boundaries between them. */
function steps(parts: readonly Part[]): Part[][] {
	const grouped: Part[][] = [[]];
	for (const part of parts) {
		if (part.type === 'step-start') grouped.push([]);
		else grouped[grouped.length - 1].push(part);
	}
	return grouped;
}

interface ToolInput {
	query?: string;
	from?: number;
	to?: number;
	page?: string;
	document_id?: string;
	filter?: string;
}

interface PageResult {
	work_title?: string;
	work_id?: string;
	title?: string;
	ref?: { document_id: string; page_no: number };
}

const pages = (from: number, to: number) =>
	from === to ? COPY.work.page(from) : COPY.work.pages(from, to);

/** What a tool call is doing, in the reader's words rather than the wire's. */
function describeTool(part: ToolPart): Omit<WorkStep, 'id' | 'state'> {
	const input = (part.input ?? {}) as ToolInput;
	const output = Array.isArray(part.output)
		? (part.output as PageResult[])
		: [];
	const count = output.length;

	switch (toolName(part)) {
		case 'search_pages': {
			const works = new Set(output.map((hit) => hit.work_id)).size;
			return {
				action: COPY.work.searched,
				subject: `“${input.query ?? ''}”`,
				result: ready(part)
					? count === 0
						? COPY.work.nothing
						: COPY.work.hits(count, works)
					: null,
			};
		}
		case 'read_pages': {
			const from = input.from ?? 0;
			const to = input.to ?? from;
			const work = output[0]?.work_title;
			return {
				action: COPY.work.read,
				subject: work ? `${work}, ${pages(from, to)}` : pages(from, to),
				result: ready(part) ? COPY.work.gotPages(count) : null,
			};
		}
		case 'view_page':
			return {
				action: COPY.work.looked,
				subject: input.page ?? '',
				result: ready(part) ? COPY.work.scan : null,
			};
		case 'list_works':
			return {
				action: COPY.work.listed,
				subject: input.filter
					? `${COPY.work.library} — “${input.filter}”`
					: COPY.work.library,
				result: ready(part) ? COPY.work.works(count) : null,
			};
		default:
			return {
				action: toolName(part).replace(/_/g, ' '),
				subject: '',
				result: ready(part) ? COPY.work.done : null,
			};
	}
}

/** Why a tool call came back empty-handed, briefly. */
const whyFailed = (part: ToolPart) =>
	(part.errorText ?? '').split('\n')[0].slice(0, 90) || COPY.work.failed;

function summarise(work: readonly WorkStep[], parts: readonly Part[]): string {
	const searches = work.filter(
		(step) => step.action === COPY.work.searched
	).length;

	const seen = new Set<string>();
	const works = new Set<string>();
	for (const part of parts) {
		if (!isTool(part) || toolName(part) !== 'read_pages' || !ready(part))
			continue;
		for (const page of (part.output ?? []) as PageResult[]) {
			if (page.ref)
				seen.add(`${page.ref.document_id}#${page.ref.page_no}`);
			if (page.work_id) works.add(page.work_id);
		}
	}
	return COPY.workSummary(searches, seen.size, works.size);
}

export function readMessage(
	message: ScribeMessage,
	streaming: boolean
): ReadMessage {
	const grouped = steps(message.parts);
	const answerParts = grouped[grouped.length - 1] ?? [];

	// A step is only in progress while the stream is open; a closed stream
	// leaves nothing running, however it ended.
	const stateOf = (part: ToolPart): WorkStep['state'] =>
		failed(part)
			? 'failed'
			: ready(part) || !streaming
				? 'done'
				: 'running';

	const work: WorkStep[] = message.parts.filter(isTool).map((part) => {
		const described = describeTool(part);
		return {
			id: part.toolCallId,
			...described,
			result: failed(part) ? whyFailed(part) : described.result,
			state: stateOf(part),
		};
	});

	const citations = message.parts.find(
		(
			part
		): part is Part & { type: 'data-citations'; data: AnswerCitation[] } =>
			part.type === 'data-citations'
	)?.data;

	const answer = answerParts
		.filter(isText)
		.map((part) => part.text)
		.join('\n')
		.trim();

	return {
		answer,
		work,
		summary: summarise(work, message.parts),
		citations,
		modelId: message.metadata?.model_id,
	};
}
