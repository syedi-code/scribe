import { useEffect } from 'react';
import { focusComposer } from '../state/composer';
import { toggleOnlyCited } from '../state/reader';
import type { Tab } from './tabs';

/**
 * `/` to write, `c` to dim everything uncited.
 *
 * Escape belongs to whatever is open and handles itself, so it is not here.
 * Neither is anything a reader might be typing: a key pressed inside a field
 * is a character, not a command.
 */
export function useShortcuts(onTab: (tab: Tab) => void) {
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement | null;
			if (
				target?.tagName === 'TEXTAREA' ||
				target?.tagName === 'INPUT' ||
				event.metaKey ||
				event.ctrlKey ||
				event.altKey
			) {
				return;
			}
			if (event.key === '/') {
				event.preventDefault();
				onTab('ask');
				focusComposer();
			}
			if (event.key === 'c') toggleOnlyCited();
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, [onTab]);
}
