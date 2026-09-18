import { useCallback, useEffect, useRef, useState } from 'react';
import { scanUrl } from '../api/documents';
import { COPY } from '../copy';
import { useAsync } from '../lib/useAsync';
import { openScan, type Scan } from './pdf';

/**
 * The scan, over the drawer.
 *
 * A citation names a page of a book, and until now the only way to that page
 * was a signed link into the browser's own PDF viewer — which on a phone means
 * a new tab, a hundred-megabyte download and page 1 of 400, because iOS
 * ignores `#page=`. The page is drawn here instead: the reader stays in the
 * answer they were reading, lands on the page that was cited, and comes back
 * with one tap.
 *
 * Nothing here checks anything, and nothing here is coloured. A scan is the
 * paper the quote was read off, and the verdict about it is already in the
 * header behind this layer.
 */

/** How far a tap magnifies. Enough that a scanned footnote is readable. */
const MAGNIFIED = 2.4;
/** The paper is inset from the edges, so the page reads as a sheet on a table. */
const GUTTER = 12;

interface Focus {
	/** Where the tap was, as a fraction of the page, and where on screen. */
	x: number;
	y: number;
	left: number;
	top: number;
}

export function ScanView({
	documentId,
	pageNo,
	title,
	onClose,
}: {
	documentId: string;
	pageNo: number;
	/** Which book this is. A scanned page on its own says nothing about that. */
	title: string | undefined;
	onClose: () => void;
}) {
	const [page, setPage] = useState(pageNo);
	const [zoom, setZoom] = useState(1);
	const [width, setWidth] = useState(0);
	const [drawing, setDrawing] = useState(true);
	const [failed, setFailed] = useState(false);
	const holder = useRef<HTMLDivElement>(null);
	const canvas = useRef<HTMLCanvasElement>(null);
	const focus = useRef<Focus | null>(null);

	const opened = useAsync(async (): Promise<{
		scan: Scan;
		url: string;
	} | null> => {
		const url = await scanUrl(documentId);
		return url ? { scan: await openScan(url), url } : null;
	}, [documentId]);
	const scan = opened.value?.scan ?? null;

	// The drawer mounts this on the page a citation named and unmounts it when
	// the reader goes back, so there is no stale page to reset: opening a scan
	// always starts on the page that was cited, fitted to the screen.
	useEffect(() => {
		const sheet = holder.current;
		if (!sheet) return;
		const measure = () => setWidth(sheet.clientWidth - GUTTER * 2);
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(sheet);
		return () => observer.disconnect();
	}, []);

	// One page, drawn at the size it is actually shown, so magnifying it
	// redraws the type rather than stretching the pixels.
	useEffect(() => {
		const sheet = canvas.current;
		if (!scan || !sheet || width <= 0) return;
		let live = true;
		setDrawing(true);
		const task = scan.draw(page, sheet, Math.round(width * zoom));
		const settle = (broke: boolean) => {
			if (!live) return;
			setDrawing(false);
			setFailed(broke);
		};
		task.done.then(
			() => settle(false),
			() => settle(true)
		);
		return () => {
			live = false;
			task.cancel();
		};
	}, [scan, page, width, zoom]);

	// Keep whatever was under the finger under the finger, once the page it
	// was tapped on has been redrawn at the new size.
	useEffect(() => {
		const sheet = holder.current;
		const held = focus.current;
		if (!sheet || !held || drawing) return;
		focus.current = null;
		sheet.scrollLeft = held.x * sheet.scrollWidth - held.left;
		sheet.scrollTop = held.y * sheet.scrollHeight - held.top;
	}, [drawing, zoom]);

	const turn = useCallback(
		(to: number) => {
			if (!scan || to < 1 || to > scan.pages) return;
			setPage(to);
			// A page is turned to at its head, however far down the last one
			// the reader had scrolled.
			const sheet = holder.current;
			if (sheet) sheet.scrollTop = 0;
		},
		[scan]
	);

	// Arrow keys turn the page. Escape belongs to whatever is open and is
	// handled by the drawer, which closes this before itself.
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'ArrowLeft') turn(page - 1);
			if (event.key === 'ArrowRight') turn(page + 1);
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [turn, page]);

	const magnify = (event?: { clientX: number; clientY: number }) => {
		const sheet = holder.current;
		if (sheet && event) {
			const box = sheet.getBoundingClientRect();
			const left = event.clientX - box.left;
			const top = event.clientY - box.top;
			focus.current = {
				x: (sheet.scrollLeft + left) / sheet.scrollWidth,
				y: (sheet.scrollTop + top) / sheet.scrollHeight,
				left,
				top,
			};
		}
		setZoom((at) => (at === 1 ? MAGNIFIED : 1));
	};

	const missing = !opened.loading && !opened.value;
	const broken = Boolean(opened.error) || failed || missing;

	return (
		<div className="bg-paper absolute inset-0 flex flex-col">
			<header className="border-paper-deep flex items-center gap-2 border-b py-1.5 pr-4 pl-1">
				<button
					type="button"
					onClick={onClose}
					aria-label={COPY.scan.back}
					className="text-ink-soft hover:text-ink press text-ask flex h-11 w-9 shrink-0 items-center justify-center"
				>
					‹
				</button>
				{title && (
					<span className="work-title text-ink text-ask min-w-0 truncate">
						{title}
					</span>
				)}
				<span className="font-app text-small text-ink-faint ml-auto shrink-0 tabular-nums">
					{scan ? COPY.scan.where(page, scan.pages) : ''}
				</span>
			</header>

			<div
				ref={holder}
				className="bg-bubble relative flex-1 overflow-auto overscroll-contain"
				style={{ padding: GUTTER }}
			>
				{/* The sheet itself. A tap magnifies where it was tapped; the
				    button in the header does the same thing for a keyboard. */}
				<canvas
					ref={canvas}
					role="img"
					aria-label={COPY.scan.where(page, scan?.pages ?? 0)}
					onClick={magnify}
					className={`bg-paper-lift block shadow-[0_1px_3px_rgba(36,31,26,0.18)] ${
						zoom > 1 ? 'cursor-zoom-out' : 'mx-auto cursor-zoom-in'
					} ${broken ? 'hidden' : ''}`}
				/>

				{(opened.loading || drawing || broken) && (
					<p
						role="status"
						className={`font-app text-small text-ink-soft m-0 ${
							broken
								? ''
								: 'absolute inset-x-0 top-1/2 text-center'
						}`}
					>
						{broken
							? missing
								? COPY.pageView.noScan
								: COPY.scan.unreachable
							: COPY.scan.loading}
					</p>
				)}
			</div>

			{/* Turning the page is the thing a reader does most here, so the
			    two chevrons are a finger wide and sit together as a pair. */}
			<footer className="border-paper-deep flex items-center gap-4 border-t py-1 pr-4 pl-1">
				<button
					type="button"
					onClick={() => turn(page - 1)}
					disabled={!scan || page <= 1}
					aria-label={COPY.scan.previous}
					className="text-ink-soft hover:text-ink press text-ask flex h-11 w-9 items-center justify-center disabled:opacity-30"
				>
					‹
				</button>
				<button
					type="button"
					onClick={() => turn(page + 1)}
					disabled={!scan || page >= scan.pages}
					aria-label={COPY.scan.next}
					className="text-ink-soft hover:text-ink press text-ask -ml-3 flex h-11 w-9 items-center justify-center disabled:opacity-30"
				>
					›
				</button>
				<button
					type="button"
					onClick={() => magnify()}
					disabled={!scan}
					aria-pressed={zoom > 1}
					className="font-app text-small text-ink-soft hover:text-ink border-paper-deep border-b disabled:opacity-40"
				>
					{zoom > 1 ? COPY.scan.fit : COPY.scan.magnify}
				</button>
				{opened.value && (
					<a
						href={`${opened.value.url}#page=${page}`}
						target="_blank"
						rel="noopener"
						className="font-app text-small text-ink-soft hover:text-ink border-paper-deep ml-auto border-b"
					>
						{COPY.scan.download}
					</a>
				)}
			</footer>
		</div>
	);
}
