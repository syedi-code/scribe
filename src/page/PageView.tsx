import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { loadPages } from '../api/documents';
import { COPY } from '../copy';
import { locatePage, reflow } from '../citations/page';
import { presentationOf, verdictKey } from '../citations/status';
import { useCitedPage } from '../citations/useCitedPage';
import { findQuote } from '../citations/window';
import { useAsync } from '../lib/useAsync';
import { closePage, useOpenPage } from '../state/reader';
import { ScanView } from './ScanView';
import type { AnswerCitation, PageText, QuoteContext } from '../api/types';

/**
 * The page behind a citation.
 *
 * One drawer, opened by citation, never one per citation. It shows the page in
 * *its own words* — not the model's — because the difference between the two is
 * the entire subject: a quote that matched across a line-break hyphen shows the
 * hyphen. A partial match shows where it stopped. A page with no text layer
 * says so rather than showing an empty drawer.
 *
 * Nothing here re-checks anything. The check happened on the server, once, and
 * a quote that came back not found stays not found — the reader is offered the
 * page instead, and can look.
 */

function Passage({
	context,
	partial,
}: {
	context: QuoteContext;
	partial: string | undefined;
}) {
	return (
		<p className="font-read text-ask m-0 leading-[1.7]">
			<span className="text-ink-faint">…{context.before}</span>
			{partial ? (
				<>
					<mark className="passage-partial">{partial}</mark>
					<span className="font-app text-small text-rubric whitespace-nowrap">
						{' '}
						— {COPY.pageView.matchedToHere}{' '}
					</span>
					{context.text.slice(partial.length)}
				</>
			) : (
				<mark className="passage-found">{context.text}</mark>
			)}
			<span className="text-ink-faint">{context.after}…</span>
		</p>
	);
}

/** The page entire, for a quote that could not be found anywhere on it. */
function WholePage({ pages }: { pages: PageText[] }) {
	return (
		<>
			{pages.map((page) => (
				<div key={page.ref.page_no} className="mb-5 last:mb-0">
					{pages.length > 1 && (
						<p className="font-app text-small text-ink-faint mb-1">
							{locatePage({
								printed_page: page.printed_page,
								page_no: page.ref.page_no,
							})}
						</p>
					)}
					{page.text ? (
						reflow(page.text).map((paragraph, at) => (
							<p
								key={at}
								className="font-read mt-0 mb-3 leading-[1.7] last:mb-0"
							>
								{paragraph}
							</p>
						))
					) : (
						<p className="m-0">{COPY.pageView.noText}</p>
					)}
				</div>
			))}
		</>
	);
}

/**
 * What the drawer shows, in one decision.
 *
 * The quote lit in its own paragraph is the whole point of opening this, and
 * everything else earns its place or is not shown. The verdict is already in
 * the header, so a paragraph restating it is cut; a citation that came back
 * verified needs no prose explaining that it did. Only a citation with
 * something wrong with it gets a line of explanation, and only the words that
 * say what is wrong.
 */
function Body({ citation }: { citation: AnswerCitation }) {
	const { page } = useCitedPage(citation);
	const [spread, setSpread] = useState(false);
	const lead =
		COPY.pageView.lead[
			verdictKey(citation) as keyof typeof COPY.pageView.lead
		];

	const from = page ? (spread ? Math.max(1, page.page_no - 1) : page.page_no) : 0;
	const to = page ? (spread ? page.page_no + 1 : page.page_no) : 0;
	const fetched = useAsync(
		page && citation.status !== 'unverifiable'
			? () => loadPages(page.document_id, from, to)
			: null,
		[page?.document_id, from, to, citation.status]
	);

	if (!page) {
		return <p className="font-app text-small text-ink-soft m-0">{lead}</p>;
	}

	if (citation.status === 'unverifiable') {
		return (
			<>
				<Quoted quote={citation.quote} />
				<Note>{lead}</Note>
			</>
		);
	}

	if (fetched.loading) {
		return <p className="text-ink-soft m-0">{COPY.pageView.loading}</p>;
	}
	if (fetched.error || !fetched.value?.length) {
		return <p className="text-ink-soft m-0">{COPY.pageView.unreachable}</p>;
	}

	const pages = fetched.value;
	const partial =
		citation.status === 'unverified' && citation.reason === 'partial_match'
			? citation.matched_prefix
			: undefined;

	// The server's window when it sends one, and otherwise the same window
	// found here in the page it already fetched.
	const context =
		citation.context ??
		findQuote(
			pages.flatMap((one) => reflow(one.text ?? '')).join('\n\n'),
			partial ?? citation.quote
		);

	return (
		<>
			{context ? (
				<Passage context={context} partial={partial} />
			) : (
				<WholePage pages={pages} />
			)}

			{/* The quote is lit in the passage above; repeating it underneath
			    was the same words twice. It is only worth printing when it is
			    nowhere to be found on the page. */}
			{!context && <Quoted quote={citation.quote} />}

			{lead && citation.status !== 'verified' && <Note>{lead}</Note>}
			{context?.spans_page_break && <Note>{COPY.pageView.spansBreak}</Note>}

			{!spread && (
				<button
					type="button"
					onClick={() => setSpread(true)}
					className="font-app text-small text-ink-soft hover:text-ink border-paper-deep mt-5 border-b"
				>
					{COPY.pageView.around(
						Math.max(1, page.page_no - 1),
						page.page_no + 1
					)}
				</button>
			)}
		</>
	);
}

/** A short line about the citation, never about the interface. */
const Note = ({ children }: { children: ReactNode }) => (
	<p className="font-app text-small text-ink-soft border-paper-deep mt-4 border-t pt-3">
		{children}
	</p>
);

/** The quote on its own, for when the page cannot show it in place. */
const Quoted = ({ quote }: { quote: string }) => (
	<p className="m-0">
		<span className="font-app text-small text-ink-soft mb-1 block">
			{COPY.pageView.quoted}
		</span>
		<span className="font-read text-ask leading-[1.7] italic">
			“{quote}”
		</span>
	</p>
);

export function PageView() {
	const open = useOpenPage();
	const drawer = useRef<HTMLDivElement>(null);
	const opener = useRef<HTMLElement | null>(null);
	const { page } = useCitedPage(open?.citation ?? null);
	const showing = open !== null;
	// Which citation's scan is open, rather than whether one is: a second
	// citation opened over the first is a different page of a different book,
	// and the scan does not carry over to it.
	const [scanned, setScanned] = useState<AnswerCitation | null>(null);
	const scanning = scanned !== null && scanned === open?.citation;

	// The drawer takes focus, and gives it back to whatever opened it — on the
	// way *out* only. Opening a second citation over the first must not throw
	// focus back to the first on its way past.
	//
	// `preventScroll`, because the drawer is still parked off the right edge
	// when it is focused, and scrolling to reach it carried the app off the
	// left of a phone screen with the drawer behind it.
	useEffect(() => {
		if (!showing) return;
		drawer.current?.focus({ preventScroll: true });
		return () => opener.current?.focus();
	}, [showing]);

	useEffect(() => {
		if (open) opener.current = open.opener;
	}, [open]);

	useEffect(() => {
		if (!showing) return;
		const onKeyDown = (event: KeyboardEvent) => {
			// Escape puts away the topmost thing, which is the scan when the
			// reader has one open and the drawer underneath it when they do not.
			if (event.key === 'Escape') {
				if (scanning) setScanned(null);
				else closePage();
			}
			if (event.key !== 'Tab' || !drawer.current) return;
			const focusable = drawer.current.querySelectorAll<HTMLElement>(
				'button, [href], textarea, [tabindex]:not([tabindex="-1"])'
			);
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (!first) return;
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [showing, scanning]);

	const citation = open?.citation ?? null;

	return (
		<>
			{/* The page is over the answer, not beside it: a tap on what it
			    covers puts it away. */}
			{showing && (
				<div
					aria-hidden
					onClick={closePage}
					className="bg-ink/10 absolute inset-0 z-(--z-drawer)"
				/>
			)}
			<aside
				ref={drawer}
				tabIndex={-1}
				role="dialog"
				aria-modal={showing}
				aria-hidden={!showing}
				aria-label={page?.work_title ?? COPY.pageView.close}
				className={`bg-paper-lift border-paper-deep absolute inset-y-0 right-0 z-(--z-drawer) flex w-drawer max-w-full flex-col border-l transition-transform duration-[380ms] ease-paper @max-compact:w-full @max-compact:border-l-0 ${
					showing ? 'translate-x-0' : 'translate-x-[101%]'
				}`}
			>
				{citation && (
					<>
						<header className="border-paper-deep flex items-start justify-between gap-4 border-b px-5 pt-4 pb-3">
							<div>
								<h3 className="work-title m-0 text-[17px] leading-tight">
									{page?.work_title ?? citation.handle}
								</h3>
								<p className="font-app text-small text-ink-soft mt-0.5">
									{page
										? `${page.creator} — ${locatePage(page)} — handle ${citation.handle}`
										: citation.handle}
								</p>
								<p
									className={`font-app text-small mt-0.5 ${presentationOf(citation).ink}`}
								>
									{presentationOf(citation).verdict}
								</p>
							</div>
							<button
								type="button"
								onClick={closePage}
								className="font-app text-small text-ink-soft hover:text-ink -mt-1 -mr-2 shrink-0 px-2 py-1"
							>
								{COPY.pageView.close}
							</button>
						</header>

						<div className="text-ask overflow-y-auto px-5 py-4 leading-relaxed">
							<Body
								key={`${citation.handle}:${citation.ref?.page_no ?? ''}:${citation.quote.slice(0, 24)}`}
								citation={citation}
							/>
						</div>

						<footer className="border-paper-deep mt-auto flex gap-4 border-t px-5 pt-3 pb-3.5">
							{page?.viewable ? (
								<button
									type="button"
									onClick={() => setScanned(citation)}
									className="font-app text-small text-ink-soft hover:text-ink border-paper-deep border-b"
								>
									{COPY.pageView.seeScan}
								</button>
							) : (
								<span className="font-app text-small text-ink-soft">
									{COPY.pageView.noScan}
								</span>
							)}
						</footer>

						{/* Over the passage rather than beside it: on a phone
						    the drawer is the screen, and a scan is worth the
						    whole of it. Last in the drawer, so it stacks on
						    what it covers without a layer of its own. */}
						{scanning && page && (
							<ScanView
								documentId={page.document_id}
								pageNo={page.page_no}
								title={page.work_title}
								onClose={() => setScanned(null)}
							/>
						)}
					</>
				)}
			</aside>
		</>
	);
}
