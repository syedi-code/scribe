import { useState } from 'react';
import { createPortal } from 'react-dom';
import { COPY } from '../copy';
import { useConversation } from '../chat/context';
import { Composer } from './Composer';
import { Conversation } from './Conversation';
import { Home } from './Home';

/**
 * Ask: the home screen until there is a conversation, the conversation after
 * that, and one composer that moves between the two.
 *
 * The composer is portalled rather than rendered twice — it is the same
 * textarea in both places, holding the same draft.
 */
export function AskPanel() {
	const { atHome } = useConversation();
	const [homeSlot, setHomeSlot] = useState<HTMLDivElement | null>(null);
	const [dockSlot, setDockSlot] = useState<HTMLDivElement | null>(null);
	const slot = atHome ? homeSlot : dockSlot;

	return (
		<section className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]">
			{atHome ? <Home composerSlot={setHomeSlot} /> : <Conversation />}

			{!atHome && (
				<div className="px-5 pt-2 pb-3.5 @max-compact:px-3.5 @max-compact:pt-1.5 @max-compact:pb-2.5">
					{/* The dock spans the spread, but the composer holds the
					    reading column — not the margin beside it. */}
					<div className="max-w-spread mx-auto w-full @max-fold:max-w-thread">
						<div ref={setDockSlot} className="max-w-thread" />
						<p className="font-app text-tiny text-ink-faint max-w-thread mt-1.5 @max-compact:hidden">
							{COPY.hint}
						</p>
					</div>
				</div>
			)}

			{slot && createPortal(<Composer />, slot)}
		</section>
	);
}
