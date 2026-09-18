import { describe, it, expect, afterEach, vi } from 'vitest';
import { act, render, screen, cleanup } from '@testing-library/react';
import { Waiting } from './Waiting';

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

/** Let the clock's interval fire for `seconds` of wall time. */
async function wait(seconds: number) {
	await act(async () => {
		vi.advanceTimersByTime(seconds * 1000);
	});
}

describe('the wait before an answer', () => {
	it('says what it is doing without a clock at first', () => {
		vi.useFakeTimers();
		render(<Waiting />);
		expect(screen.getByText(/looking for something to read/)).toBeTruthy();
		expect(screen.queryByText(/0:0\d/)).toBeNull();
	});

	// A slow model is silent for minutes. Without the clock there is nothing
	// to tell a wait from a hang.
	it('starts counting once the wait is long enough to explain', async () => {
		vi.useFakeTimers();
		render(<Waiting />);
		await wait(9);
		expect(screen.getByText('0:09')).toBeTruthy();
	});

	it('counts past a minute in minutes and seconds', async () => {
		vi.useFakeTimers();
		render(<Waiting />);
		await wait(125);
		expect(screen.getByText('2:05')).toBeTruthy();
	});

	// A phone that froze the tab comes back to the time that passed, not to
	// the number of ticks it managed to run.
	it('reads the clock off the wall, not off its own ticks', async () => {
		vi.useFakeTimers();
		render(<Waiting />);
		vi.setSystemTime(Date.now() + 90_000);
		await act(async () => {
			document.dispatchEvent(new Event('visibilitychange'));
		});
		expect(screen.getByText('1:30')).toBeTruthy();
	});
});
