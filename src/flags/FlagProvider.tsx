import { useMemo, type ReactNode } from 'react';
import { useAsync } from '../lib/useAsync';
import { FlagContext, type FlagState } from './context';
import { DEFAULT_FLAGS } from './flags';
import { loadFlags } from './load';

/**
 * One fetch of `GET /api/flags`, held for the life of the tab.
 *
 * A flag is a fact about the deployment, not about the reader, so it is asked
 * for once and never again. While it is in flight — and if it fails, which on
 * an old deployment means the route does not exist yet — every flag reads as
 * its fallback, so a feature nobody turned on stays off rather than flickering
 * on.
 */
export function FlagProvider({ children }: { children: ReactNode }) {
	const asked = useAsync(() => loadFlags(), []);

	const value = useMemo<FlagState>(
		() => ({
			flags: asked.value ?? DEFAULT_FLAGS,
			loading: asked.loading,
		}),
		[asked.value, asked.loading]
	);

	return <FlagContext value={value}>{children}</FlagContext>;
}
