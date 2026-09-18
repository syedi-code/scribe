/**
 * Where the notes go down the margin.
 */

const GAP = 14;

/**
 * Where each note goes: level with its quote, but never over the note above
 * it. A note whose quote has not been measured yet is `null`, and still gets a
 * place — skipping it left its `top` unset, which put every unplaced note at
 * the top of the margin, on top of each other.
 */
export function stackNotes(
	beside: readonly (number | null)[],
	heights: readonly number[],
	gap = GAP
): number[] {
	let floor = 0;
	return beside.map((wanted, at) => {
		const top = Math.max(floor, wanted ?? floor);
		floor = top + (heights[at] ?? 0) + gap;
		return top;
	});
}
