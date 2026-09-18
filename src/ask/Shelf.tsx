import { COPY } from '../copy';
import { describePage } from '../citations/page';
import { presentationOf } from '../citations/status';
import { useCitedPage } from '../citations/useCitedPage';
import { openPage } from '../state/reader';
import { AuthorName } from '../ui/AuthorName';
import type { CitationGroup, GroupedCitation } from '../citations/group';

/**
 * One book, and every reference an answer made into it.
 *
 * The badge is the stamp from the prose at reading size: filled when the words
 * were on the page, open when they were not, dotted when the page had no text
 * to check against. The shape carries the verdict and the colour reinforces
 * it, so a row of eight badges can be read at a glance and still survives
 * being printed.
 *
 * Every badge is the way into its page, and says in words what the square says
 * in shape — a screen reader is told the page and the verdict, never a colour.
 */

function Badge({
	entry,
	lit,
	onLight,
}: {
	entry: GroupedCitation;
	lit: boolean;
	onLight: (index: number | null) => void;
}) {
	const { citation, marker, index } = entry;
	const { page } = useCitedPage(citation);
	const { verdict, stamp } = presentationOf(citation);
	const where = page ? describePage(page) : marker.handle;
	const label = citation
		? COPY.stampLabel(verdict, where)
		: COPY.checkingLabel(where);

	return (
		<button
			type="button"
			disabled={!citation}
			onClick={(event) =>
				citation && openPage(citation, event.currentTarget)
			}
			onFocus={() => onLight(index)}
			onBlur={() => onLight(null)}
			aria-label={label}
			title={label}
			className={`hover:bg-bubble grid size-7 place-items-center rounded-md transition-colors ${
				lit ? 'bg-bubble' : ''
			}`}
		>
			<span
				aria-hidden
				className={`block size-3 border-2 transition-[background-color,border-color,transform] duration-300 ease-paper ${stamp}`}
			/>
		</button>
	);
}

export function Shelf({
	group,
	lit,
	onLight,
}: {
	group: CitationGroup;
	lit: number | null;
	onLight: (index: number | null) => void;
}) {
	const { page } = useCitedPage(group.named);

	return (
		<div className="bg-paper-lift border-paper-deep rounded-xl border px-3 pt-2.5 pb-2">
			<div className="flex items-baseline justify-between gap-3">
				<span className="work-title font-read text-ask text-ink leading-snug">
					{page?.work_title ?? COPY.verdict.unknown_handle}
				</span>
				<span className="font-app text-tiny text-ink-faint shrink-0">
					{group.entries.length}
				</span>
			</div>
			{page && (
				<span className="font-app text-small text-ink-soft mt-0.5 block">
					<AuthorName creator={page.creator} />
				</span>
			)}
			{/* The squares carry the verdicts, so the rule above them is the
			    only thing separating a book from what was taken out of it. */}
			<div className="border-paper-deep -ml-1.5 mt-2 flex flex-wrap items-center gap-0.5 border-t pt-1.5">
				{group.entries.map((entry) => (
					<Badge
						key={entry.index}
						entry={entry}
						lit={lit === entry.index}
						onLight={onLight}
					/>
				))}
			</div>
		</div>
	);
}
