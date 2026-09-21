import type { ReactNode } from 'react';
import { libraryWorks } from '../api/library';
import { CITATION_STATUS } from '../citations/status';
import { COPY } from '../copy';
import { useAsync } from '../lib/useAsync';

const ABOUT = COPY.about;

/** The three rules a quotation can carry, each beside what it means. */
const KEY = ['verified', 'not_found', 'no_text_layer'] as const;

/**
 * What Scribe is, for someone who has never used it.
 *
 * In the order a visitor needs it: what this is, how to use it, how to read
 * what comes back, what it holds, where it falls short, what happens to what
 * they type, and what it costs. The key to the underlines is drawn from the
 * status map, so it cannot come to describe a mark the answers no longer make.
 *
 * The count in the first line is the catalogue's, fetched once a tab and
 * shared with the shelves; if it cannot be had, the line says it without one.
 */
export function AboutPanel() {
	const catalogue = useAsync(() => libraryWorks(), []);
	const works = catalogue.value?.length ?? null;
	const names = catalogue.value
		? new Set(catalogue.value.map((work) => work.creator)).size
		: null;

	return (
		<section className="grid min-h-0 grid-rows-[minmax(0,1fr)]">
			<div className="overflow-y-auto px-5 py-8 @max-compact:px-3.5 @max-compact:py-6">
				<article className="max-w-thread font-read text-prose text-ink mx-auto w-full font-light">
					<h1 className="font-read text-ink m-0 text-3xl leading-tight font-normal">
						{ABOUT.title}
					</h1>
					<p className="text-lede mt-4 mb-0">
						{ABOUT.lead(works, names)}
					</p>
					<p className="text-ink-soft mt-3 mb-0">{ABOUT.purpose}</p>

					<Part head={ABOUT.use.head}>
						<ol className="m-0 grid list-none gap-2.5 p-0">
							{ABOUT.use.steps.map((step, at) => (
								<li
									key={step}
									className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-baseline"
								>
									<span className="text-ink-faint tabular-nums">
										{at + 1}.
									</span>
									<span>{step}</span>
								</li>
							))}
						</ol>
					</Part>

					<Part head={ABOUT.checks.head}>
						<p className="my-3">{ABOUT.checks.body}</p>
						<dl className="border-paper-deep m-0 my-4 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-5 gap-y-2 border-l py-1 pl-4">
							{KEY.map((verdict) => (
								<div key={verdict} className="contents">
									<dt className="text-ink font-normal whitespace-nowrap">
										<span
											className={
												CITATION_STATUS[verdict]
													.underline
											}
										>
											{ABOUT.sample}
										</span>
									</dt>
									<dd className="text-ink-soft m-0">
										{ABOUT.key[verdict]}
									</dd>
								</div>
							))}
						</dl>
						<p className="my-3">{ABOUT.checks.after}</p>
					</Part>

					<Paragraphs {...ABOUT.library} />
					<Paragraphs {...ABOUT.limits} />
					<Paragraphs {...ABOUT.privacy} />
					<Paragraphs {...ABOUT.cost} />
				</article>
			</div>
		</section>
	);
}

function Part({ head, children }: { head: string; children: ReactNode }) {
	return (
		<>
			<h2 className="section-head">{head}</h2>
			{children}
		</>
	);
}

function Paragraphs({ head, body }: { head: string; body: readonly string[] }) {
	return (
		<Part head={head}>
			{body.map((paragraph) => (
				<p key={paragraph} className="my-3">
					{paragraph}
				</p>
			))}
		</Part>
	);
}
