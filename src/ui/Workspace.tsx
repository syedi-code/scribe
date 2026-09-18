import { AskPanel } from '../ask/AskPanel';
import { useConversation } from '../chat/context';
import { BooksPanel } from '../books/BooksPanel';
import { PageView } from '../page/PageView';
import { Rail } from './Rail';
import type { Tab } from './tabs';

/**
 * Everything under the header: the rail when there is anything to list, the
 * panel that is showing, and the page behind a citation over the top of both.
 * Narrow, the rail and the panel take turns at the whole page.
 *
 * The drawer belongs here rather than to the shell. `inset-y-0` one level up
 * covered the header with it.
 */
export function Workspace({
	tab,
	onNavigate,
	railable,
}: {
	tab: Tab;
	/** A conversation was chosen: whatever tab you were on, you are reading now. */
	onNavigate: () => void;
	railable: boolean;
}) {
	// Wide, Sessions is the rail beside Ask; narrow, it is instead of it.
	const sessions = tab === 'sessions' && railable;
	const { atHome } = useConversation();

	return (
		<main
			className={`relative grid min-h-0 ${
				railable
					? 'grid-cols-[var(--container-rail)_minmax(0,1fr)] @max-compact:grid-cols-1'
					: 'grid-cols-1'
			}`}
		>
			{railable && (
				<Rail
					showing={sessions}
					risen={atHome && tab === 'ask'}
					onNavigate={onNavigate}
				/>
			)}

			<div
				className={`contents ${sessions ? '@max-compact:hidden' : ''}`}
			>
				{tab === 'books' ? <BooksPanel /> : <AskPanel />}
			</div>

			<PageView />
		</main>
	);
}
