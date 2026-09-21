import { ThreadRail } from './ThreadRail';

/**
 * Earlier questions: beside the reading surface when there is room for them,
 * and a page of their own when there is not.
 *
 * Narrow, this was a drawer that slid in over the page. A list of
 * conversations is a destination rather than an overlay, so under the compact
 * breakpoint it is the `Sessions` tab and takes the whole page — the same
 * argument that made the citation drawer full-width there. One tree: the
 * container query decides, and nothing here asks how wide the screen is.
 *
 * Going to a conversation is a move to `Ask`, wherever it was started from.
 *
 * Wide, on the home screen, the rail rises into the header's corner, which
 * is otherwise empty until the wordmark comes to it; when a conversation
 * starts it steps down out of the way as the mark arrives, on the same 300ms
 * the header takes to open.
 */
export function Rail({
	showing,
	risen,
	onNavigate,
}: {
	/** Whether the Sessions tab is the one showing, which only matters narrow. */
	showing: boolean;
	/** On the home screen, wide: up into the header's empty corner. */
	risen: boolean;
	onNavigate: () => void;
}) {
	return (
		<div
			className={`min-h-0 transition-[margin-top] duration-300 ease-paper @max-compact:mt-0 ${
				risen ? '-mt-(--header-rest)' : ''
			} ${showing ? '' : '@max-compact:hidden'}`}
		>
			<ThreadRail onNavigate={onNavigate} away={showing} />
		</div>
	);
}
