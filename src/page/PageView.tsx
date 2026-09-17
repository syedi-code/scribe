import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { loadDocument, loadPages } from '../api/documents';
import { COPY } from '../copy';
import { locatePage } from '../citations/page';
import { presentationOf, verdictKey } from '../citations/status';
import { useCitedPage } from '../citations/useCitedPage';
import { useAsync } from '../lib/useAsync';
import { closePage, useOpenPage } from '../state/reader';
import type { AnswerCitation, QuoteContext } from '../api/types';

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
		<p className="m-0">
			…{context.before}
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
			{context.after}…
		</p>
	);
}

/** The whole page, for the answers whose citations arrive without a match window. */
function WholePage({
	documentId,
	from,
	to,
}: {
	documentId: string;
	from: number;
	to: number;
}) {
	const pages = useAsync(
		() => loadPages(documentId, from, to),
		[documentId, from, to]
	);

	if (pages.loading)
		return <p className="text-ink-soft m-0">{COPY.pageView.loading}</p>;
	if (pages.error || !pages.value?.length)
		return <p className="text-ink-soft m-0">{COPY.pageView.unreachable}</p>;

	return (
		<>
			{pages.value.map((page) => (
				<div key={page.ref.page_no} className="mb-5 last:mb-0">
					{pages.value!.length > 1 && (
						<p className="font-app text-small text-ink-faint mb-1">
							{locatePage({
								printed_page: page.printed_page,
								page_no: page.ref.page_no,
							})}
						</p>
					)}
					<p className="m-0 whitespace-pre-line">
						{page.text ?? COPY.pageView.noText}
					</p>
				</div>
			))}
		</>
	);
}

function Body({ citation }: { citation: AnswerCitation }) {
	const { page } = useCitedPage(citation);
	const [spread, setSpread] = useState<[number, number] | null>(null);
	const context = citation.context ?? null;
	const lead =
		COPY.pageView.lead[
			verdictKey(citation) as keyof typeof COPY.pageView.lead
		];

	if (!page) {
		return <p className="font-app text-small text-ink-soft m-0">{lead}</p>;
	}

	const around: [number, number] = [
		Math.max(1, page.page_no - 1),
		page.page_no + 1,
	];

	return (
		<>
			<p className="font-app text-small text-ink-soft border-paper-deep mb-3.5 border-b pb-3">
				{lead}
				{!context && citation.status !== 'unverifiable' && (
					<> {COPY.pageView.wholePage}</>
				)}
				{context?.spans_page_break && <> {COPY.pageView.spansBreak}</>}
			</p>

			{context ? (
				<Passage
					context={context}
					partial={
						citation.status === 'unverified' &&
						citation.reason === 'partial_match'
							? citation.matched_prefix
							: undefined
					}
				/>
			) : citation.status === 'unverifiable' ? (
				<p className="m-0 italic">“{citation.quote}”</p>
			) : (
				<WholePage
					documentId={page.document_id}
					from={spread?.[0] ?? page.page_no}
					to={spread?.[1] ?? page.page_no}
				/>
			)}

			{!context && citation.status !== 'unverifiable' && (
				<p className="border-paper-deep text-ink-soft mt-4 border-t pt-3">
					<span className="font-app text-small block">
						{COPY.pageView.quoted}
					</span>
					<span className="italic">“{citation.quote}”</span>
				</p>
			)}

			{!spread && !context && citation.status !== 'unverifiable' && (
				<button
					type="button"
					onClick={() => setSpread(around)}
					className="font-app text-small text-ink-soft hover:text-ink border-paper-deep mt-4 border-b"
				>
					{COPY.pageView.around(around[0], around[1])}
				</button>
			)}
		</>
	);
}

function Scan({ documentId, pageNo }: { documentId: string; pageNo: number }) {
	const document = useAsync(() => loadDocument(documentId), [documentId]);
	const key = document.value?.file_key;

	const open = async () => {
		if (!key) return;
		const { token } = await api.post<{ token: string }>('/files/sign', {
			path: key,
		});
		window.open(
			`/api/files/${key}?token=${encodeURIComponent(token)}#page=${pageNo}`,
			'_blank',
			'noopener'
		);
	};

	if (!key)
		return (
			<span className="font-app text-small text-ink-soft">
				{COPY.pageView.noScan}
			</span>
		);

	return (
		<button
			type="button"
			onClick={() => void open()}
			className="font-app text-small text-ink-soft hover:text-ink border-paper-deep border-b"
		>
			{COPY.pageView.seeScan}
		</button>
	);
}

export function PageView() {
	const open = useOpenPage();
	const drawer = useRef<HTMLDivElement>(null);
	const opener = useRef<HTMLElement | null>(null);
	const { page } = useCitedPage(open?.citation ?? null);

	// The drawer takes focus, and gives it back to whatever opened it.
	useEffect(() => {
		if (!open) return;
		opener.current = open.opener;
		drawer.current?.focus();
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') closePage();
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
		return () => {
			document.removeEventListener('keydown', onKeyDown);
			opener.current?.focus();
		};
	}, [open]);

	const citation = open?.citation ?? null;

	return (
		<aside
			ref={drawer}
			tabIndex={-1}
			role="dialog"
			aria-modal="false"
			aria-hidden={!open}
			aria-label={page?.work_title ?? COPY.pageView.close}
			className={`bg-paper-lift border-paper-deep absolute inset-y-0 right-0 z-30 flex w-drawer max-w-full flex-col border-l transition-transform duration-[380ms] ease-paper @max-compact:w-full @max-compact:border-l-0 ${
				open ? 'translate-x-0' : 'translate-x-[101%]'
			}`}
		>
			{citation && (
				<>
					<header className="border-paper-deep flex items-start justify-between gap-4 border-b px-5 pt-4 pb-3">
						<div>
							<h3 className="m-0 text-[17px] leading-tight font-normal italic">
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
							className="font-app text-small text-ink-soft hover:text-ink"
						>
							{COPY.pageView.close}
						</button>
					</header>

					<div className="text-ask overflow-y-auto px-5 py-4 leading-relaxed">
						<Body citation={citation} />
					</div>

					<footer className="border-paper-deep mt-auto flex gap-4 border-t px-5 pt-3 pb-3.5">
						{page && page.viewable ? (
							<Scan
								documentId={page.document_id}
								pageNo={page.page_no}
							/>
						) : (
							<span className="font-app text-small text-ink-soft">
								{COPY.pageView.noScan}
							</span>
						)}
					</footer>
				</>
			)}
		</aside>
	);
}
