import { useCallback, useState } from 'react';
import { useConversation } from '../chat/context';
import { Dialogs } from './Dialogs';
import { Header } from './Header';
import { useShortcuts } from './useShortcuts';
import { Workspace } from './Workspace';
import type { Tab } from './tabs';

/**
 * The shell: the header, and everything under it.
 *
 * The layout responds to this element's own width through container queries
 * rather than the viewport's. There is no `isMobile` anywhere in the tree, and
 * no second layout component for small screens.
 *
 * Which tab is showing is the only thing held here, because it is the only
 * thing the header and the workspace both need. Everything else belongs to
 * whichever of them does it.
 */
export function AppFrame() {
	const { threads } = useConversation();
	const [tab, setTab] = useState<Tab>('ask');
	// Opening a conversation is a move to the reading surface, wherever it was
	// started from — the shelves, or the list of sessions itself.
	const readConversation = useCallback(() => setTab('ask'), []);

	useShortcuts(setTab);

	return (
		<div
			// The drawer parks itself just off the right edge, so the shell
			// clips: nothing of the app may widen the page. `clip` rather than
			// `hidden`, because `hidden` is still a scroll container and
			// focusing the parked drawer scrolled the app sideways under it.
			className="bg-paper relative grid h-full grid-rows-[auto_minmax(0,1fr)] overflow-clip @container"
		>
			<Header tab={tab} onTab={setTab} railable={threads.length > 0} />
			<Workspace
				tab={tab}
				onNavigate={readConversation}
				railable={threads.length > 0}
			/>
			<Dialogs />
		</div>
	);
}
