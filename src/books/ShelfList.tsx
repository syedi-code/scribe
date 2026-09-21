import type { ReactNode } from 'react';
import { COPY } from '../copy';
import { AuthorName } from '../ui/AuthorName';
import { Row } from './Row';
import { SINGLES_ID, shelfId, type Shelf } from './shelve';

/**
 * A shelf per name with more than one work, then one shelf of single volumes
 * with each name beside its title.
 *
 * The heading stays pinned while its shelf scrolls under it, so ten works
 * down Foucault's shelf the page still says whose they are.
 */
export function ShelfList({
	shelves,
	singles,
}: {
	shelves: Shelf[];
	singles: Shelf[];
}) {
	return (
		<>
			{shelves.map((shelf) => (
				<Section
					key={shelf.creator}
					id={shelfId(shelf.creator)}
					name={<AuthorName creator={shelf.creator} />}
					count={COPY.books.holds(shelf.holds)}
				>
					{shelf.works.map((work) => (
						<Row key={work.work_id} work={work} />
					))}
				</Section>
			))}

			{singles.length > 0 && (
				<Section
					id={SINGLES_ID}
					name={COPY.books.singles}
					count={COPY.books.names(singles.length)}
				>
					{singles.map((shelf) =>
						shelf.works.map((work) => (
							<Row key={work.work_id} work={work} named />
						))
					)}
				</Section>
			)}
		</>
	);
}

function Section({
	id,
	name,
	count,
	children,
}: {
	id: string;
	name: ReactNode;
	count: string;
	children: ReactNode;
}) {
	return (
		<div id={id} className="mt-3 first:mt-2">
			{/* The name is the only thing set against the paper; everything
			    under it is the work itself. */}
			<h2 className="bg-paper border-paper-deep font-app text-ui text-ink-soft sticky top-0 m-0 mb-1 flex items-baseline justify-between gap-4 border-b pt-3 pb-1 font-normal">
				<span>{name}</span>
				<span className="text-small text-ink-faint whitespace-nowrap">
					{count}
				</span>
			</h2>
			<ul className="m-0 list-none p-0">{children}</ul>
		</div>
	);
}
