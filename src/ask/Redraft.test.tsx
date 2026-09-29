import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { COPY } from '../copy';
import { Redraft } from './Redraft';

/**
 * On 29 September a whole answer streamed in and was then replaced mid-stream
 * by a second draft, with no word of why. The reader is told, and the first
 * draft is kept where they can find it.
 */
describe('an answer written twice', () => {
	it('says why while the second draft is on its way', () => {
		render(<Redraft draft="A draft." writing unchecked={false} />);
		expect(screen.getByText(COPY.redraft.writing)).toBeTruthy();
	});

	it('keeps the first draft, folded away, in plain words', () => {
		render(
			<Redraft
				draft="He calls it <cite P1>monumental history</cite>, in <title>Use and Abuse</title>."
				writing={false}
				unchecked={false}
			/>
		);
		expect(screen.getByText(COPY.redraft.done)).toBeTruthy();
		expect(screen.getByText(COPY.redraft.draft)).toBeTruthy();
		expect(
			screen.getByText(
				'He calls it monumental history, in Use and Abuse.'
			)
		).toBeTruthy();
	});

	it('says when the second draft could not be checked either', () => {
		render(<Redraft draft="" writing={false} unchecked />);
		expect(screen.getByText(COPY.redraft.unchecked)).toBeTruthy();
		expect(screen.queryByText(COPY.redraft.draft)).toBeNull();
	});
});
