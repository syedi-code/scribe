import type { UIMessage } from 'ai';
import { COPY } from '../copy';
import type { AnswerCitation } from '../api/types';

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
 */

export type ScribeMessage = UIMessage<
	{ model_id?: string },
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
}

/** One line of the apparatus: what the model did, named. */
export interface WorkStep {
	id: string;
	label: string;
	/** The last step is live while the model is still working. */
	running: boolean;
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

/** Groups parts by the step boundaries between them. */
function steps(parts: readonly Part[]): Part[][] {
	const grouped: Part[][] = [[]];
	for (const part of parts) {
		if (part.type === 'step-start') grouped.push([]);
		else grouped[grouped.length - 1].push(part);
	}
	return grouped;
}

interface SearchInput {
	query?: string;
}
interface ReadInput {
	from?: number;
	to?: number;
}
interface ViewInput {
	page?: string;
}
interface PageResult {
	work_title?: string;
	work_id?: string;
}

/** What a tool call says it is doing, in the reader's words rather than the wire's. */
function describeTool(part: ToolPart): string[] {
	const input = (part.input ?? {}) as SearchInput & ReadInput & ViewInput;
	const output = Array.isArray(part.output)
		? (part.output as PageResult[])
		: [];

	switch (toolName(part)) {
		case 'search_pages': {
			const searching = COPY.searching(input.query ?? '');
			if (!ready(part)) return [searching];
			const works = new Set(output.map((hit) => hit.work_id));
			return [searching, COPY.searched(output.length, works.size)];
		}
		case 'read_pages': {
			const from = input.from ?? 0;
			const to = input.to ?? from;
			const work = output[0]?.work_title;
			return [
				work
					? COPY.readingWork(work, from, to)
					: COPY.reading(from, to),
			];
		}
		case 'view_page':
			return [COPY.viewing(input.page ?? '')];
		case 'list_works':
			return [COPY.listingWorks];
		default:
			return [toolName(part).replace(/_/g, ' ')];
	}
}

/** Narration is apparatus too, but it is the model's voice, so it is kept whole. */
const narration = (text: string) => text.trim().replace(/\s+/g, ' ');

function summarise(parts: readonly Part[]): string {
	const tools = parts.filter(isTool);
	const searches = tools.filter(
		(part) => toolName(part) === 'search_pages'
	).length;

	const pages = new Set<string>();
	const works = new Set<string>();
	for (const part of tools) {
		if (toolName(part) !== 'read_pages' || !ready(part)) continue;
		for (const page of (part.output ?? []) as {
			ref?: { document_id: string; page_no: number };
			work_id?: string;
		}[]) {
			if (page.ref)
				pages.add(`${page.ref.document_id}#${page.ref.page_no}`);
			if (page.work_id) works.add(page.work_id);
		}
	}
	return COPY.workSummary(searches, pages.size, works.size);
}

export function readMessage(
	message: ScribeMessage,
	streaming: boolean
): ReadMessage {
	const grouped = steps(message.parts);
	const answerParts = grouped[grouped.length - 1] ?? [];
	const before = grouped.slice(0, -1).flat();

	const work: WorkStep[] = [];
	before.forEach((part, index) => {
		if (isText(part) && narration(part.text)) {
			work.push({
				id: `${index}`,
				label: narration(part.text),
				running: false,
			});
		} else if (isTool(part)) {
			for (const [line, label] of describeTool(part).entries()) {
				work.push({
					id: `${part.toolCallId}:${line}`,
					label,
					running: false,
				});
			}
		}
	});

	// Only the very last thing the model did is still happening, and only while
	// the stream is open. A finished answer has no live line.
	const last = work[work.length - 1];
	if (last && streaming && answerParts.every((part) => !isText(part))) {
		last.running = true;
	}

	const citations = message.parts.find(
		(
			part
		): part is Part & { type: 'data-citations'; data: AnswerCitation[] } =>
			part.type === 'data-citations'
	)?.data;

	return {
		answer: answerParts
			.filter(isText)
			.map((part) => part.text)
			.join('\n')
			.trim(),
		work,
		summary: summarise(message.parts),
		citations,
		modelId: message.metadata?.model_id,
	};
}
