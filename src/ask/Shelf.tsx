import { COPY } from '../copy';
import { describePage } from '../citations/page';
import { presentationOf, verdictKey } from '../citations/status';
import { useCitedPage } from '../citations/useCitedPage';
import { openPage } from '../state/reader';
import { AuthorName } from '../ui/AuthorName';
import type { CitationGroup, GroupedCitation } from '../citations/group';

/**
 * One book, and every reference an answer made into it.
 *
 * Not a card: the book's name, and a pip per reference under it. The pip is
 * the stamp from the prose at reading size — filled when the words were on
 * the page, open when they were not, dotted when the page had no text to check
 * against — so a row of them reads at a glance and still survives printing.
 *
 * Past five a row of pips stops being countable at a glance, so each verdict
 * becomes one pip and a number. Kept per verdict rather than one total: seven
 * found and one not is the fact the reader needs, and a single count would
 * hide the one that failed.
 *
 * A pip is 44px tall to take a finger and only as wide as its rhythm needs;
 * 44 both ways put more space between the marks than the marks themselves.
 */

const SINGLY = 5;

const pip = (stamp: string) =>
	`block size-4 border-2 transition-[background-color,border-color] duration-300 ease-paper ${stamp}`;

const cell = (lit: boolean) =>
	`hover:bg-bubble -my-2 flex h-11 items-center justify-center rounded-md transition-colors disabled:cursor-default ${
		lit ? 'bg-bubble' : ''
	}`;

function Pip({
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
			className={`${cell(lit)} w-7`}
		>
			<span aria-hidden className={pip(stamp)} />
		</button>
	);
}

/** Every reference with one verdict, as a pip and how many; opens the first. */
function Tally({
	entries,
	lit,
	onLight,
}: {
	entries: GroupedCitation[];
	lit: number | null;
	onLight: (index: number | null) => void;
}) {
	const [first] = entries;
	const { verdict, stamp } = presentationOf(first.citation);
	const label = COPY.tallyLabel(entries.length, verdict);

	return (
		<button
			type="button"
			disabled={!first.citation}
			onClick={(event) =>
				first.citation && openPage(first.citation, event.currentTarget)
			}
			onFocus={() => onLight(first.index)}
			onBlur={() => onLight(null)}
			aria-label={label}
			title={label}
			className={`${cell(entries.some((entry) => entry.index === lit))} gap-1.5 px-1.5`}
		>
			<span aria-hidden className={pip(stamp)} />
			<span
				aria-hidden
				className="font-app text-small text-ink-soft tabular-nums"
			>
				{entries.length}
			</span>
		</button>
	);
}

/** References with the same mark, in the order the marks are first met. */
function byMark(entries: GroupedCitation[]): GroupedCitation[][] {
	const marks = new Map<string, GroupedCitation[]>();
	for (const entry of entries) {
		const { stamp } = presentationOf(entry.citation);
		marks.set(stamp, [...(marks.get(stamp) ?? []), entry]);
	}
	return [...marks.values()];
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
	const title = page?.work_title ?? group.shown?.work_title;
	const creator = page?.creator ?? group.shown?.creator;
	// Only a verdict can say the page was never shown. Before one lands the
	// book is simply not known yet, which is a different claim.
	const never =
		group.named !== null && verdictKey(group.named) === 'unknown_handle';

	return (
		<div>
			<p className="text-ask m-0 leading-snug">
				{title ? (
					<span className="work-title text-ink">{title}</span>
				) : (
					<span className="font-app text-small text-ink-faint">
						{never
							? COPY.verdict.unknown_handle
							: COPY.verdict.pending}
					</span>
				)}
				{creator && (
					<span className="font-app text-small text-ink-soft">
						{' · '}
						<AuthorName creator={creator} />
					</span>
				)}
			</p>
			<div className="-ml-1.5 flex flex-wrap items-center">
				{group.entries.length > SINGLY
					? byMark(group.entries).map((entries) => (
							<Tally
								key={entries[0].index}
								entries={entries}
								lit={lit}
								onLight={onLight}
							/>
						))
					: group.entries.map((entry) => (
							<Pip
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
