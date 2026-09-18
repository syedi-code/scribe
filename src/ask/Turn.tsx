import { useCallback, useMemo, useState } from 'react';
import { COPY } from '../copy';
import {
	alignCitations,
	markersFor,
	segmentAnswer,
	trimHalfWrittenCitation,
} from '../citations/parse';
import { surnamesOf } from '../citations/authors';
import { useStaggeredResolve } from '../citations/useResolve';
import { readMessage, type ScribeMessage } from '../chat/message';
import { useModels } from '../models/context';
import { Answer } from './Answer';
import { AnswerFooter } from './AnswerFooter';
import { Apparatus } from './Apparatus';
import { MarginNotes } from './MarginNotes';

/**
 * One exchange: the question, what the model did, what it answered, and the
 * evidence beside it.
 *
 * A Turn derives everything it renders from one assistant message plus the user
 * message before it. It owns no state but the hover.
 */
export function Turn({
	question,
	message,
	streaming,
	failure,
	onRetry,
}: {
	question: string;
	message: ScribeMessage | null;
	streaming: boolean;
	failure?: string;
	onRetry?: () => void;
}) {
	const { labelFor, selected } = useModels();
	const [lit, setLit] = useState<number | null>(null);
	const [column, setColumn] = useState<HTMLDivElement | null>(null);
	const [anchors] = useState(() => new Map<number, HTMLElement>());
	// Whether this turn was on screen while the check was running: an answer
	// re-read from history has nothing left to watch.
	const [watching] = useState(streaming);

	const onAnchor = useCallback(
		(index: number, element: HTMLElement | null) => {
			if (element) anchors.set(index, element);
			else anchors.delete(index);
		},
		[anchors]
	);

	const read = useMemo(
		() => (message ? readMessage(message, streaming) : null),
		[message, streaming]
	);

	const { markers, paragraphs, citations } = useMemo(() => {
		const written = read?.answer ?? '';
		// Nothing half-written is shown: a citation appears whole or not yet.
		const answer = streaming ? trimHalfWrittenCitation(written) : written;
		const markers = markersFor(answer, read?.citations);
		const titles = [
			...new Set(
				(read?.citations ?? []).flatMap((citation) =>
					citation.page?.work_title ? [citation.page.work_title] : []
				)
			),
		].sort((a, b) => b.length - a.length);
		// Only creators the server actually checked, so nothing is inked that
		// the answer did not cite.
		const surnames = surnamesOf(
			(read?.citations ?? []).flatMap((citation) =>
				citation.page?.creator ? [citation.page.creator] : []
			)
		);

		return {
			markers,
			paragraphs: segmentAnswer(answer, markers, titles, surnames),
			citations: alignCitations(markers, read?.citations),
		};
	}, [read, streaming]);

	const resolved = useStaggeredResolve(
		markers.length,
		read?.citations,
		watching
	);

	const answered = (read?.answer.length ?? 0) > 0;
	const model = labelFor(read?.modelId) ?? selected?.label ?? null;

	return (
		<>
			<div ref={setColumn} className="relative mb-8 @max-fold:mb-2">
				<p className="bg-bubble text-ask ml-auto mb-5 w-fit max-w-[82%] rounded-[15px_15px_5px_15px] px-3 py-2 font-normal @max-compact:max-w-[88%]">
					{question}
				</p>

				{read && (
					<Apparatus
						work={read.work}
						summary={read.summary}
						live={streaming && !answered}
					/>
				)}

				{!read && streaming && (
					<p className="font-app text-small text-ink-soft doing mb-3">
						{COPY.thinking}
					</p>
				)}

				{answered && read && (
					<>
						<Answer
							paragraphs={paragraphs}
							citations={citations}
							resolved={resolved}
							streaming={streaming}
							lit={lit}
							onLight={setLit}
							onAnchor={onAnchor}
						/>
						{(!streaming || read.citations) && (
							<AnswerFooter
								citations={citations}
								total={markers.length}
								resolved={resolved}
								model={model}
							/>
						)}
					</>
				)}

				{/* Searched, read, and then stopped without writing anything —
				    what a reader saw when the server ran out of steps in the
				    middle of a tool call. An empty answer is a failed answer
				    and says so. */}
				{read && !answered && !streaming && !failure && (
					<p className="font-app text-small text-rubric mt-2 flex flex-wrap items-baseline gap-3">
						<span>{COPY.noAnswer}</span>
						{onRetry && (
							<button
								type="button"
								onClick={onRetry}
								className="border-rubric text-rubric border-b"
							>
								{COPY.retry}
							</button>
						)}
					</p>
				)}

				{failure && (
					<p className="font-app text-small text-rubric mt-2 flex flex-wrap items-baseline gap-3">
						<span>{failure}</span>
						{onRetry && (
							<button
								type="button"
								onClick={onRetry}
								className="border-rubric text-rubric border-b"
							>
								{COPY.retry}
							</button>
						)}
					</p>
				)}
			</div>

			<MarginNotes
				markers={markers}
				citations={citations}
				resolved={resolved}
				lit={lit}
				onLight={setLit}
				turn={column}
				anchors={anchors}
			/>
		</>
	);
}
