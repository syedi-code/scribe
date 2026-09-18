import { useMemo, useState } from 'react';
import { libraryWorks } from '../api/library';
import { COPY } from '../copy';
import { useAsync } from '../lib/useAsync';
import type { Work } from '../api/types';

/**
 * The shelves: what the library holds, under whoever wrote it.
 *
 * A bibliography, and nothing more. No covers, no blurbs, no counts of
 * anything but works and pages — the point of the list is to let a reader see
 * what an answer can possibly be drawn from, and a denser page says that
 * better than a sparser one would.
 *
 * alexandria already returns the catalogue ordered by creator then title, so
 * the grouping below preserves that order rather than imposing its own.
 */

interface Shelf {
	creator: string;
	works: Work[];
}

/** Every word must appear somewhere, so "Foucault prison" finds one work. */
function matches(work: Work, terms: string[]): boolean {
	const haystack = `${work.title} ${work.creator} ${
		work.originally_published ?? ''
	}`.toLowerCase();
	return terms.every((term) => haystack.includes(term));
}

function shelve(works: Work[], search: string): Shelf[] {
	const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
	const shelves: Shelf[] = [];
	for (const work of works) {
		if (terms.length > 0 && !matches(work, terms)) continue;
		const last = shelves[shelves.length - 1];
		if (last?.creator === work.creator) last.works.push(work);
		else shelves.push({ creator: work.creator, works: [work] });
	}
	return shelves;
}

function Row({ work }: { work: Work }) {
	// One malformed row must not take the whole shelf down with it.
	const documents = work.documents ?? [];
	const pages = documents.reduce(
		(total, document) => total + document.page_count,
		0
	);
	const scanOnly =
		documents.length > 0 &&
		documents.every((document) => document.text === 'scan');

	return (
		<li className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 py-[3px]">
			<span className="font-read text-ask text-ink font-light">
				<span className="work-title">{work.title}</span>
				{work.originally_published && (
					<span className="font-app text-small text-ink-faint ml-2 whitespace-nowrap">
						{work.originally_published}
					</span>
				)}
			</span>
			<span className="font-app text-tiny text-ink-faint whitespace-nowrap">
				{scanOnly ? COPY.books.unsearchable : COPY.books.pages(pages)}
			</span>
		</li>
	);
}

export function BooksPanel() {
	const [search, setSearch] = useState('');
	const shelves = useAsync(() => libraryWorks(), []);

	const found = useMemo(
		() => shelve(shelves.value ?? [], search),
		[shelves.value, search]
	);
	const works = found.reduce((total, shelf) => total + shelf.works.length, 0);

	return (
		<section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)]">
			<div className="border-paper-deep border-b px-5 pt-4 pb-3 @max-compact:px-3.5">
				<div className="max-w-doc mx-auto flex w-full flex-wrap items-baseline gap-x-4 gap-y-1">
					<input
						type="search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder={COPY.books.search}
						aria-label={COPY.books.search}
						className="font-read text-ask text-ink border-paper-deep focus:border-edge min-w-0 flex-1 border-b bg-transparent py-1 font-light outline-none transition-colors"
					/>
					{shelves.value && (
						<span className="font-app text-small text-ink-faint">
							{COPY.books.tally(works, found.length)}
						</span>
					)}
				</div>
				{/* Said once, under the search, so nobody reads the list as an
				    offer of the files behind it. */}
				<p className="font-app text-small text-ink-faint max-w-doc mx-auto mt-2 mb-0 w-full">
					{COPY.books.blurb}
				</p>
			</div>

			<div className="overflow-y-auto px-5 py-5 @max-compact:px-3.5">
				<div className="max-w-doc mx-auto w-full">
					{shelves.loading && (
						<p className="font-app text-small text-ink-soft doing m-0">
							{COPY.books.loading}
						</p>
					)}
					{shelves.error != null && (
						<p className="font-app text-small text-rubric m-0">
							{COPY.books.unreachable}
						</p>
					)}
					{shelves.value && found.length === 0 && (
						<p className="font-app text-small text-ink-soft m-0">
							{COPY.books.nothing(search.trim())}
						</p>
					)}

					{found.map((shelf) => (
						<div
							key={shelf.creator}
							className="mb-6 last:mb-0 @max-compact:mb-5"
						>
							{/* The name is the only thing set against the paper;
							    everything under it is the work itself. */}
							<h2 className="font-app text-ui text-ink-soft border-paper-deep m-0 mb-1 border-b pb-1 font-normal">
								{shelf.creator}
							</h2>
							<ul className="m-0 list-none p-0">
								{shelf.works.map((work) => (
									<Row key={work.work_id} work={work} />
								))}
							</ul>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
