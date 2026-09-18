import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import { COPY } from '../copy';
import { usePagesShown, type ShownPage } from '../chat/shown';
import { groupByDocument } from '../citations/group';
import { describePage, locatePage } from '../citations/page';
import { presentationOf } from '../citations/status';
import { useCitedPage } from '../citations/useCitedPage';
import { openPage } from '../state/reader';
import { AuthorName } from '../ui/AuthorName';
import { stackNotes } from './stack';
import { Shelf } from './Shelf';
import type { AnswerCitation } from '../api/types';
import type { CitationMarker } from '../citations/parse';

/**
 * The margin.
 *
 * On a wide screen every citation has a note beside the sentence it supports,
 * naming the work, the creator, both page numbers and the verdict in words.
 * Under the fold the column becomes footnotes under the answer — one component
 * tree, container queries, and no `isMobile` anywhere: the CSS decides, and the
 * one thing JavaScript asks it is whether the notes are positioned or stacked.
 *
 * Each note sits level with its quote, pushed down only as far as the note
 * above it requires.
 *
 * Under the fold the notes give way to one entry per book with a badge per
 * reference into it: six references into one book printed its title six times,
 * which on a phone was most of the screen. Both forms are in the tree and the
 * container query picks one, so there is still no `isMobile` here and no
 * second component deciding which layout it is.
 */

interface NoteProps {
	index: number;
	marker: CitationMarker;
	citation: AnswerCitation | null;
	/** The book as the model was shown it, known before the verdict is. */
	shown: ShownPage | null;
	lit: boolean;
	onLight: (index: number | null) => void;
}

function Note({ index, marker, citation, shown, lit, onLight }: NoteProps) {
	const { page } = useCitedPage(citation);
	const { verdict, rule, ink } = presentationOf(citation);
	const element = useRef<HTMLButtonElement>(null);
	const checked = citation !== null;

	// A 3px nudge as the verdict lands, so a pass down the page reads as a pass
	// rather than a flicker.
	useEffect(() => {
		const note = element.current;
		if (!checked || !note) return;
		const settle = () => note.classList.remove('animate-nudge');
		note.classList.add('animate-nudge');
		note.addEventListener('animationend', settle, { once: true });
		return () => {
			note.removeEventListener('animationend', settle);
			settle();
		};
	}, [checked]);

	return (
		<button
			ref={element}
			type="button"
			data-note={index}
			disabled={!citation}
			onClick={(event) =>
				citation && openPage(citation, event.currentTarget)
			}
			onMouseEnter={() => onLight(index)}
			onMouseLeave={() => onLight(null)}
			onFocus={() => onLight(index)}
			onBlur={() => onLight(null)}
			className={`font-app text-small text-ink-soft hover:text-ink absolute left-0 w-full border-l-[1.5px] pl-2.5 text-left transition-[top,color,border-color] duration-300 ease-paper @max-fold:static @max-fold:w-full ${rule} ${
				lit ? 'text-ink' : ''
			}`}
		>
			<span className="text-ink-faint float-right">{marker.handle}</span>
			{page ? (
				<>
					<span className="work-title text-ink block">
						{page.work_title}
					</span>
					<span className="block">
						<AuthorName creator={page.creator} /> —{' '}
						{locatePage(page)}
					</span>
				</>
			) : shown ? (
				<>
					<span className="work-title text-ink block">
						{shown.work_title}
					</span>
					<span className="block">
						<AuthorName creator={shown.creator} />
					</span>
				</>
			) : citation?.ref ? (
				<span className="text-ink block">
					{`document ${citation.ref.document_id.slice(0, 8)} — PDF p. ${citation.ref.page_no}`}
				</span>
			) : null}
			<span className={`mt-0.5 block ${ink}`}>
				{citation ? verdict : COPY.verdict.pending}
			</span>
			<span className="sr-only">{page ? describePage(page) : ''}</span>
		</button>
	);
}

/**
 * The leader: a hairline from the column's edge across to the note, turning a
 * right angle where the two rows differ.
 *
 * It was a bezier for a while and read as a stray wobble in the gutter. Right
 * angles are what a drawn leader does on a printed page, and they are what the
 * rest of this interface is made of — rules, squares, a margin. It starts at
 * the column's edge rather than at the quote's own right edge, or a citation
 * that ends mid-line drags the line back across the prose.
 */
function Leader({
	margin,
	turn,
	anchor,
	index,
}: {
	margin: HTMLElement | null;
	turn: HTMLElement | null;
	anchor: HTMLElement | null;
	index: number | null;
}) {
	const path = useRef<SVGPathElement>(null);

	// Drawn straight onto the element: the geometry is the browser's to know,
	// and re-rendering React to carry a path string back to it buys nothing.
	useLayoutEffect(() => {
		const line = path.current;
		if (!line) return;
		const drawable =
			margin &&
			turn &&
			anchor &&
			getComputedStyle(margin).position !== 'static';
		if (!drawable) return line.removeAttribute('d');

		const note = margin.querySelector<HTMLElement>(
			`[data-note="${index}"]`
		);
		const box = margin.getBoundingClientRect();
		const quote = anchor.getBoundingClientRect();
		const target = (note ?? anchor).getBoundingClientRect();
		const x1 = turn.getBoundingClientRect().right - box.left + 4;
		const y1 = quote.top - box.top + quote.height / 2;
		const y2 = target.top - box.top + 8;

		// Out from the column, across the gutter, then in to the note. The
		// turn is made at the halfway point so neither leg is a stub.
		const corner = Math.round(x1 / 2);
		const straight = Math.abs(y1 - y2) < 1.5;
		line.setAttribute(
			'd',
			straight
				? `M ${x1} ${y1} H 0`
				: `M ${x1} ${y1} H ${corner} V ${y2} H 0`
		);
		line.style.setProperty('--len', String(line.getTotalLength()));
	}, [margin, turn, anchor, index]);

	return (
		<svg
			aria-hidden
			className="pointer-events-none absolute inset-0 overflow-visible @max-fold:hidden"
		>
			<path ref={path} className="leader-path" />
		</svg>
	);
}

export function MarginNotes({
	markers,
	citations,
	resolved,
	lit,
	onLight,
	turn,
	anchors,
}: {
	markers: CitationMarker[];
	citations: (AnswerCitation | null)[];
	resolved: number;
	lit: number | null;
	onLight: (index: number | null) => void;
	turn: HTMLElement | null;
	anchors: Map<number, HTMLElement>;
}) {
	const [margin, setMargin] = useState<HTMLDivElement | null>(null);
	const shown = usePagesShown();

	/** Stack the notes beside their quotes, when the column is a column. */
	const place = useCallback(() => {
		if (!margin) return;
		const notes = [...margin.querySelectorAll<HTMLElement>('[data-note]')];
		if (getComputedStyle(margin).position === 'static') {
			for (const note of notes) note.style.top = '';
			return;
		}
		const base = margin.getBoundingClientRect().top;
		const beside = notes.map((note) => {
			const anchor = anchors.get(Number(note.dataset.note));
			return anchor ? anchor.getBoundingClientRect().top - base : null;
		});
		const tops = stackNotes(
			beside,
			notes.map((note) => note.offsetHeight)
		);
		notes.forEach((note, at) => (note.style.top = `${tops[at]}px`));
	}, [margin, anchors]);

	useLayoutEffect(place);

	useEffect(() => {
		if (!margin || !turn) return;
		const observer = new ResizeObserver(place);
		observer.observe(turn);
		observer.observe(margin);
		addEventListener('resize', place);
		void document.fonts?.ready.then(place);
		return () => {
			observer.disconnect();
			removeEventListener('resize', place);
		};
	}, [margin, turn, place]);

	if (markers.length === 0) return <div aria-hidden />;

	return (
		<div
			ref={setMargin}
			className="relative @max-fold:static @max-fold:mb-8 @max-fold:border-t @max-fold:border-paper-deep @max-fold:pt-3"
		>
			<Leader
				margin={margin}
				turn={turn}
				index={lit}
				anchor={lit === null ? null : (anchors.get(lit) ?? null)}
			/>

			<div className="@max-fold:hidden">
				{markers.map((marker, index) => (
					<Note
						key={index}
						index={index}
						marker={marker}
						citation={index < resolved ? citations[index] : null}
						shown={shown.get(marker.handle) ?? null}
						lit={lit === index}
						onLight={onLight}
					/>
				))}
			</div>

			<div className="hidden @max-fold:grid @max-fold:gap-3">
				{groupByDocument(markers, citations, resolved, shown).map(
					(group) => (
						<Shelf
							key={group.key}
							group={group}
							lit={lit}
							onLight={onLight}
						/>
					)
				)}
			</div>
		</div>
	);
}
