import { useEffect, useState } from 'react';

/**
 * Whole seconds since this component mounted.
 *
 * Read off a timestamp rather than counted, because a phone that locks or
 * backgrounds the tab stops running timers and would come back showing the
 * number of ticks it managed rather than the time that passed. The same
 * reason it listens for the tab coming back: the first thing a reader does on
 * returning is look at the clock, and a stale one reads as a hang.
 */
export function useElapsed(): number {
	const [seconds, setSeconds] = useState(0);

	useEffect(() => {
		const started = Date.now();
		const read = () => setSeconds(Math.floor((Date.now() - started) / 1000));
		const timer = setInterval(read, 1000);
		document.addEventListener('visibilitychange', read);

		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', read);
		};
	}, []);

	return seconds;
}
