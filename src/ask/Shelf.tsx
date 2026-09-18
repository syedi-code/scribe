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
 * Not a card and not a block: one line. The book's name, and its pips ranged
 * right on the same line — an entry in a ledger, which is what this is. Two
 * lines per book was a phone screen of apparatus under every answer about four
 * books; one tight line is 34, and reads down the left edge as a list of what
 * the answer stood on.
 *
 * The pip is the stamp from the prose at reading size — filled when the words
 * were on the page, open when they were not, dotted when the page had no text
 * to check against — so a row of them reads at a glance and still survives
 * printing.
 *
 * Past five a row of pips stops being countable at a glance, so each verdict
 * becomes one pip and a number. Kept per verdict rather than one total: seven
 * found and one not is the fact the reader needs, and a single count would
 * hide the one that failed.
 *
 * The rows are set tight, because four books under an answer is a list to run
 * an eye down, not four bands of air. A row is 32px and the rows are 2px
 * apart, so the pitch is 34 and four books cost 136px of a phone instead of
 * 176. A pip is drawn 14px inside a 32px cell and takes the 2px between rows,
 * giving a 34px target: smaller than the 44 a finger is usually promised, and
 * the trade that buys the compactness. What it may never do is overlap — two
 * rows' targets meeting would open the wrong book — so the cell's reach above
 * and below is exactly the gap and never more.
 *
 * The name is set at the size the margin sets its notes at, because this *is*
 * the margin note, folded.
 */

const SINGLY = 5;

const pip = (stamp: string) =>
	`block size-3.5 border-2 transition-[background-color,border-color] duration-300 ease-paper ${stamp}`;

/**
 * The cell the eye sees, and the target the finger gets. The pseudo-element
 * takes the row's gap on both sides, which is the only space there is to take:
 * 32 drawn plus 1 above and 1 below is the 34 the pitch allows, and two rows'
 * targets meet without ever overlapping.
 */
const cell = (lit: boolean) =>
	`hover:bg-bubble relative flex h-8 w-6 shrink-0 items-center justify-center rounded transition-colors after:absolute after:inset-x-0 after:-inset-y-px after:content-[''] disabled:cursor-default ${
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
			className={cell(lit)}
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
			className={`${cell(entries.some((entry) => entry.index === lit))} w-auto gap-0.5 px-1`}
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
		<div className="flex min-w-0 items-center gap-2">
			{/* The name gives way before the pips do: a truncated title is
			    still a title, and a missing verdict is a missing fact. */}
			<p className="font-app text-small m-0 min-w-0 flex-1 truncate">
				{title ? (
					<span className="work-title text-ink">{title}</span>
				) : (
					<span className="text-ink-faint">
						{never
							? COPY.verdict.unknown_handle
							: COPY.verdict.pending}
					</span>
				)}
				{creator && (
					<span className="text-ink-soft">
						{' · '}
						<AuthorName creator={creator} />
					</span>
				)}
			</p>
			<div className="-mr-1 flex shrink-0 items-center">
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
