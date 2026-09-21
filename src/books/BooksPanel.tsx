import { useMemo, useRef, useState } from 'react';
import { libraryWorks } from '../api/library';
import { COPY } from '../copy';
import { useAsync } from '../lib/useAsync';
import { ShelfIndex } from './ShelfIndex';
import { ShelfList } from './ShelfList';
import { shelve } from './shelve';

/**
 * The shelves: what the library holds, under whoever wrote it.
 *
 * A bibliography, and nothing more. No covers, no blurbs, no counts of
 * anything but works and pages — the point of the list is to let a reader see
 * what an answer can possibly be drawn from, and a denser page says that
 * better than a sparser one would.
 *
 * The fullest shelves come first, because a library of a hundred works by
 * seventy names is mostly single volumes, and filed A to Z the ten Foucaults
 * were somewhere in the middle of them.
 */
export function BooksPanel() {
	const [search, setSearch] = useState('');
	const catalogue = useAsync(() => libraryWorks(), []);
	const scroller = useRef<HTMLDivElement>(null);

	const found = useMemo(
		() => shelve(catalogue.value ?? [], search),
		[catalogue.value, search]
	);
	const jump = (id: string) =>
		scroller.current
			?.querySelector(`#${CSS.escape(id)}`)
			?.scrollIntoView({ block: 'start' });

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
					{catalogue.value && (
						<span className="font-app text-small text-ink-faint">
							{COPY.books.tally(found.works, found.names)}
						</span>
					)}
				</div>
				{/* Said once, under the search, so nobody reads the list as an
				    offer of the files behind it. */}
				<p className="font-app text-small text-ink-faint max-w-doc mx-auto mt-2 mb-0 w-full">
					{COPY.books.blurb}
				</p>
				{!search.trim() && (
					<ShelfIndex
						shelves={found.shelves}
						singles={found.singles.length}
						onJump={jump}
					/>
				)}
			</div>

			<div
				ref={scroller}
				className="overflow-y-auto px-5 pb-5 @max-compact:px-3.5"
			>
				<div className="max-w-doc mx-auto w-full">
					{catalogue.loading && (
						<p className="font-app text-small text-ink-soft doing m-0 pt-5">
							{COPY.books.loading}
						</p>
					)}
					{catalogue.error != null && (
						<p className="font-app text-small text-rubric m-0 pt-5">
							{COPY.books.unreachable}
						</p>
					)}
					{catalogue.value && found.names === 0 && (
						<p className="font-app text-small text-ink-soft m-0 pt-5">
							{COPY.books.nothing(search.trim())}
						</p>
					)}
					<ShelfList
						shelves={found.shelves}
						singles={found.singles}
					/>
				</div>
			</div>
		</section>
	);
}
