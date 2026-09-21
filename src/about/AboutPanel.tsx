import type { ReactNode } from 'react';
import { libraryWorks } from '../api/library';
import { CITATION_STATUS } from '../citations/status';
import { COPY } from '../copy';
import { useAsync } from '../lib/useAsync';

const { sections } = COPY.about;

/** The three rules a quotation can carry, each beside what it means. */
const KEY = ['verified', 'not_found', 'no_text_layer'] as const;

/**
 * What Scribe is, for someone deciding whether to trust it.
 *
 * Set as a page of the book rather than as a product page: no hero, no
 * buttons, nothing to sign up for. The key to the three rules is drawn with
 * the rules themselves, from the status map, so it cannot come to describe a
 * mark the answers no longer make.
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
			<div className="overflow-y-auto px-5 py-7 @max-compact:px-3.5 @max-compact:py-5">
				<article className="max-w-thread font-read text-prose text-ink mx-auto w-full font-light">
					<h1 className="font-read text-ink m-0 text-2xl leading-tight font-light">
						{COPY.about.title}
					</h1>
					<p className="mt-4 mb-0">{COPY.about.lead(works, names)}</p>

					<Part {...sections.made} />
					<Part {...sections.checked}>
						<dl className="font-app text-ui m-0 my-4 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-5 gap-y-2">
							{KEY.map((verdict) => (
								<div key={verdict} className="contents">
									<dt className="font-read text-ask text-ink font-normal">
										<span
											className={
												CITATION_STATUS[verdict]
													.underline
											}
										>
											{COPY.about.sample}
										</span>
									</dt>
									<dd className="text-ink-soft m-0">
										{COPY.about.key[verdict]}
									</dd>
								</div>
							))}
						</dl>
						{sections.checked.after.map((paragraph) => (
							<p key={paragraph} className="my-3">
								{paragraph}
							</p>
						))}
					</Part>
					<Part {...sections.library} />
					<Part {...sections.privacy} />
					<Part {...sections.plans} />
				</article>
			</div>
		</section>
	);
}

function Part({
	head,
	body,
	children,
}: {
	head: string;
	body: readonly string[];
	children?: ReactNode;
}) {
	return (
		<>
			<h2 className="section-head">{head}</h2>
			{body.map((paragraph) => (
				<p key={paragraph} className="my-3">
					{paragraph}
				</p>
			))}
			{children}
		</>
	);
}
