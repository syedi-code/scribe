import {
	inkClass,
	inkFor,
	sliceName,
	splitAuthors,
} from '../citations/authors';
import { COPY } from '../copy';
import { SINGLES_ID, shelfId, type Shelf } from './shelve';

/**
 * The fuller shelves as one line of surnames, each a jump to its shelf, and
 * the single volumes as the last stop. Wide only: on a phone the line wrapped
 * to five rows and took a third of the screen from the shelves it indexed,
 * where the search does the same job in one. A reader looking for Foucault should
 * not have to scroll past seventy names to find the shelf that comes first.
 */
export function ShelfIndex({
	shelves,
	singles,
	onJump,
}: {
	shelves: Shelf[];
	singles: number;
	onJump: (id: string) => void;
}) {
	if (shelves.length === 0) return null;

	const link = 'press font-app text-small hover:underline';

	return (
		<nav
			aria-label={COPY.books.index}
			className="max-w-doc mx-auto mt-2 flex w-full flex-wrap gap-x-3 gap-y-1 @max-compact:hidden"
		>
			{shelves.map((shelf) => (
				<button
					key={shelf.creator}
					type="button"
					onClick={() => onJump(shelfId(shelf.creator))}
					className={link}
				>
					<Surnames creator={shelf.creator} />
					<span className="text-ink-faint ml-1 tabular-nums">
						{shelf.holds}
					</span>
				</button>
			))}
			{singles > 0 && (
				<button
					type="button"
					onClick={() => onJump(SINGLES_ID)}
					className={`${link} text-ink-soft`}
				>
					{COPY.books.singlesJump}
				</button>
			)}
		</nav>
	);
}

/** Surnames only, in the ink each is written in everywhere else. */
function Surnames({ creator }: { creator: string }) {
	const names = splitAuthors(creator).map(
		(author) => sliceName(author).lastName
	);
	return (
		<>
			{names.map((name, at) => (
				<span key={at}>
					{at > 0 && <span className="text-ink-soft"> & </span>}
					<span className={inkClass(inkFor(name))}>{name}</span>
				</span>
			))}
		</>
	);
}
