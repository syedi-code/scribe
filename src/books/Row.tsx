import { COPY } from '../copy';
import { AuthorName } from '../ui/AuthorName';
import type { Work } from '../api/types';

/**
 * One work: its title and year, and on the right how much of it there is to
 * read. On the shelf of single volumes the name comes first, because there is
 * no heading above it to say whose it is.
 */
export function Row({ work, named = false }: { work: Work; named?: boolean }) {
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
				{named && (
					<span className="font-app text-ui text-ink-soft mr-2 font-normal">
						<AuthorName creator={work.creator} />
					</span>
				)}
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
