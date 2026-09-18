import { useCallback, useState } from 'react';
import { useConversation } from '../chat/context';
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
 * Which tab is showing and whether the rail is open are the only two things
 * held here, because they are the only two the header and the workspace both
 * need. Everything else belongs to whichever of them does it.
 */
export function AppFrame() {
	const { threads } = useConversation();
	const [tab, setTab] = useState<Tab>('ask');
	const [railOpen, setRailOpen] = useState(false);
	const closeRail = useCallback(() => setRailOpen(false), []);

	useShortcuts(setTab);

	return (
		<div
			// The drawer parks itself just off the right edge, so the shell
			// clips: nothing of the app may widen the page. `clip` rather than
			// `hidden`, because `hidden` is still a scroll container and
			// focusing the parked drawer scrolled the app sideways under it.
			className="bg-paper relative grid h-full grid-rows-[auto_minmax(0,1fr)] overflow-clip @container"
		>
			<Header
				tab={tab}
				onTab={setTab}
				onRail={() => setRailOpen((was) => !was)}
				railable={threads.length > 0}
				railOpen={railOpen}
			/>
			<Workspace
				tab={tab}
				railOpen={railOpen}
				onCloseRail={closeRail}
				railable={threads.length > 0}
			/>
		</div>
	);
}
