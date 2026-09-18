import { useCallback, useMemo, useState } from 'react';
import { COPY } from '../copy';
import {
	alignCitations,
	markersFor,
	segmentAnswer,
	trimHalfWrittenCitation,
} from '../citations/parse';
import { surnamesOf } from '../citations/authors';
import { useCitedWorks } from '../citations/useCitedWorks';
import { useLibraryNames } from '../citations/useLibraryNames';
import { useStaggeredResolve } from '../citations/useResolve';
import { readMessage, type ScribeMessage } from '../chat/message';
import { useModels } from '../models/context';
import { Answer } from './Answer';
import { AnswerFooter } from './AnswerFooter';
import { Apparatus } from './Apparatus';
import { MarginNotes } from './MarginNotes';
import { Waiting } from './Waiting';

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

	// What this answer cited, and what the library holds. The model marks its
	// own names as it writes; these are the fallback for the ones it misses,
	// and the reason a work it merely mentions is still set as a work.
	const cited = useCitedWorks(read?.citations);
	const library = useLibraryNames();

	const { markers, blocks, citations } = useMemo(() => {
		const written = read?.answer ?? '';
		// Nothing half-written is shown: a citation appears whole or not yet.
		const answer = streaming ? trimHalfWrittenCitation(written) : written;
		const markers = markersFor(answer, read?.citations);

		// Longest first in both, so a full title beats the head of it.
		const titles = [...new Set([...cited.titles, ...library.titles])].sort(
			(a, b) => b.length - a.length
		);
		const surnames = [
			...new Set([...surnamesOf(cited.creators), ...library.surnames]),
		].sort((a, b) => b.length - a.length);

		return {
			markers,
			blocks: segmentAnswer(answer, markers, titles, surnames),
			citations: alignCitations(markers, read?.citations),
		};
	}, [read, streaming, cited, library]);

	const resolved = useStaggeredResolve(
		markers.length,
		read?.citations,
		watching
	);

	const answered = (read?.answer.length ?? 0) > 0;
	// An answer is signed by whoever wrote it. The model in the switcher is
	// only the right answer for the turn being written right now: falling back
	// to it on a saved turn re-signed every old answer in the conversation
	// each time the reader changed models.
	const model =
		labelFor(read?.modelId) ?? (streaming ? selected?.label : null) ?? null;

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

				{!read && streaming && <Waiting />}

				{answered && read && (
					<>
						<Answer
							blocks={blocks}
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
