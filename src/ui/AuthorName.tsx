import { inkClass, inkedName } from '../citations/authors';

/**
 * A creator, with every surname in its own ink and its punctuation untouched.
 *
 * One component wherever a name is attributed — the margin, the badge group,
 * the shelves — so a reader sees the same person in the same ink in the prose
 * and in the reference beside it.
 */
export function AuthorName({ creator }: { creator: string }) {
	return (
		<>
			{inkedName(creator).map((piece, at) => (
				<span key={at} className={inkClass(piece.ink)}>
					{piece.text}
				</span>
			))}
		</>
	);
}
