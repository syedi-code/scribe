import { Fragment } from 'react';
import { brandedLabel } from './brand';

/**
 * A model's name, with its maker's name in the maker's colour.
 *
 * Only the maker's name is wrapped. The accessible name of an element is
 * built by trimming each child's text and joining, so wrapping ` Haiku 4.5`
 * in a span of its own announced the button as `ClaudeHaiku 4.5`.
 */
export function BrandedLabel({ label }: { label: string }) {
	return (
		<>
			{brandedLabel(label).map((piece, at) =>
				piece.ink ? (
					<span key={at} className={piece.ink}>
						{piece.text}
					</span>
				) : (
					<Fragment key={at}>{piece.text}</Fragment>
				)
			)}
		</>
	);
}
