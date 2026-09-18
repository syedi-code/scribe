import { AskPanel } from '../ask/AskPanel';
import { BooksPanel } from '../books/BooksPanel';
import { PageView } from '../page/PageView';
import { Rail } from './Rail';
import type { Tab } from './tabs';

/**
 * Everything under the header: the rail when there is anything to list, the
 * panel that is showing, and the page behind a citation over the top of both.
 *
 * The drawer belongs here rather than to the shell. `inset-y-0` one level up
 * covered the header with it.
 */
export function Workspace({
	tab,
	railOpen,
	onCloseRail,
	railable,
}: {
	tab: Tab;
	railOpen: boolean;
	onCloseRail: () => void;
	railable: boolean;
}) {
	return (
		<main
			className={`relative grid min-h-0 ${
				railable
					? 'grid-cols-[var(--container-rail)_minmax(0,1fr)] @max-compact:grid-cols-1'
					: 'grid-cols-1'
			}`}
		>
			{railable && <Rail open={railOpen} onClose={onCloseRail} />}

			{tab === 'ask' ? <AskPanel /> : <BooksPanel />}

			<PageView />
		</main>
	);
}
