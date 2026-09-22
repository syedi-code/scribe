import { COPY } from '../copy';
import { useFlag } from '../flags/context';
import { keepDraftForSignIn } from '../state/draft';
import { useSignInReason } from '../state/visitor';
import { Modal } from '../ui/Modal';

/** Where a sign-in comes back to: here, exactly, less the dialog's own hash. */
const here = () =>
	`${window.location.pathname}${window.location.search}` || '/';

/**
 * Signing in, in our words and our design rather than Cloudflare's picker.
 *
 * Each button is a plain link to a path Cloudflare Access guards with one way
 * of signing in (`/login/github`, `/login/google`), so pressing it goes
 * straight to GitHub or Google with nothing between. A link rather than a
 * popup, because Safari blocks a window opened from anything but a press.
 * Coming back, `functions/login/[[path]].ts` sends the reader to where they
 * were, and the session they open carries their guest questions with them.
 *
 * What they had typed is kept (`keepDraftForSignIn`) and is back in the
 * composer when they return.
 */
export function SignInDialog() {
	const reason = useSignInReason();
	const google = useFlag('isGoogleSignInShown');
	const next = encodeURIComponent(here());

	return (
		<Modal title={COPY.visitor.dialog.title}>
			<p className="font-read text-ui text-ink-soft m-0 leading-normal">
				{COPY.visitor.dialog.lead[reason]}
			</p>
			<div className="mt-5 grid gap-2">
				<Way href={`/login/github?next=${next}`}>
					{COPY.visitor.dialog.github}
				</Way>
				{google && (
					<Way href={`/login/google?next=${next}`}>
						{COPY.visitor.dialog.google}
					</Way>
				)}
			</div>
			<p className="font-app text-small text-ink-faint m-0 mt-4">
				{COPY.visitor.dialog.free} {COPY.visitor.dialog.kept}
			</p>
		</Modal>
	);
}

function Way({ href, children }: { href: string; children: string }) {
	return (
		<a
			href={href}
			onClick={keepDraftForSignIn}
			className="font-app text-ui bg-ink text-paper block w-full rounded-full px-4 py-3 text-center leading-none no-underline transition-opacity hover:opacity-85"
		>
			{children}
		</a>
	);
}
