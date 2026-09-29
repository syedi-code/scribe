import { COPY } from '../copy';

/** Tags the model writes that a reader should see as plain words in a draft. */
const MARKS = /<\/?(?:cite\b[^>]*|title|author)>/g;

/**
 * An answer written twice, said out loud. The first draft streamed in front
 * of the reader and then failed its check; rather than vanish from under
 * them, it folds away under a line saying why, where it can still be read.
 */
export function Redraft({
	draft,
	writing,
	unchecked,
}: {
	draft: string;
	/** The second draft has not started to arrive yet. */
	writing: boolean;
	unchecked: boolean;
}) {
	const said = writing
		? COPY.redraft.writing
		: unchecked
			? COPY.redraft.unchecked
			: COPY.redraft.done;

	return (
		<div className="mb-4" role="status" aria-live="polite">
			<p className="font-app text-small text-ink-soft m-0">{said}</p>
			{draft && (
				<details className="mt-1.5">
					<summary className="font-app text-small text-ink-faint hover:text-ink-soft w-fit cursor-pointer transition-colors">
						{COPY.redraft.draft}
					</summary>
					<p className="font-read text-small text-ink-faint m-0 mt-2 whitespace-pre-wrap">
						{draft.replace(MARKS, '')}
					</p>
				</details>
			)}
		</div>
	);
}
