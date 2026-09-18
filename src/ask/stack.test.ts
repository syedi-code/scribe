import { describe, expect, it } from 'vitest';
import { stackNotes } from './stack';

/**
 * Where the notes go down the margin.
 *
 * The bug this exists for: on a first load, a note whose quote had not been
 * measured was skipped, its `top` never set, and every skipped note sat at the
 * top of the margin over the others.
 */
describe('notes down the margin', () => {
	it('puts each one level with its quote when there is room', () => {
		expect(stackNotes([0, 200, 400], [40, 40, 40], 14)).toEqual([
			0, 200, 400,
		]);
	});

	it('pushes one down rather than letting it touch the one above', () => {
		expect(stackNotes([0, 10, 20], [40, 40, 40], 14)).toEqual([0, 54, 108]);
	});

	it('gives a note with no measured quote a place of its own', () => {
		expect(stackNotes([0, null, 400], [40, 40, 40], 14)).toEqual([
			0, 54, 400,
		]);
	});

	it('never overlaps, whatever it is given', () => {
		const heights = [40, 60, 30, 50, 40];
		const tops = stackNotes([0, null, null, 20, null], heights, 14);
		for (let at = 1; at < tops.length; at++) {
			expect(tops[at]).toBeGreaterThanOrEqual(
				tops[at - 1] + heights[at - 1]
			);
		}
	});
});
