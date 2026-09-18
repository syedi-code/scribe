import { COPY } from '../copy';
import { describePage } from '../citations/page';
import { presentationOf } from '../citations/status';
import { useCitedPage } from '../citations/useCitedPage';
import { openPage } from '../state/reader';
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
			className={`grid size-6 place-items-center rounded-[3px] transition-colors ${
				lit ? 'bg-bubble' : ''
			}`}
		>
			<span
				aria-hidden
				className={`block size-2.5 border-2 transition-[background-color,border-color] duration-300 ease-paper ${stamp}`}
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
		<div className="border-l-paper-deep border-l-[1.5px] pl-2.5">
			<span className="work-title font-app text-small text-ink block">
				{page?.work_title ?? COPY.verdict.unknown_handle}
			</span>
			{page && (
				<span className="font-app text-small text-ink-soft block">
					{page.creator}
				</span>
			)}
			<div className="-ml-1 flex flex-wrap items-center gap-0.5 pt-1">
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
