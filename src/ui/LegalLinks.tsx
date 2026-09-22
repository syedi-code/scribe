import { COPY } from '../copy';

/**
 * The terms and the privacy note, as two plain links. They are static pages
 * beside the app (`public/legal/`), not modals: they have to load for someone
 * who has not signed in, and for Stripe's reviewer.
 */
export function LegalLinks({ className = '' }: { className?: string }) {
	return (
		<p className={`font-app text-small text-ink-faint m-0 ${className}`}>
			<a
				href="/legal/terms.html"
				className="hover:text-ink border-paper-deep border-b"
			>
				{COPY.legal.terms}
			</a>
			<span aria-hidden="true"> · </span>
			<a
				href="/legal/privacy.html"
				className="hover:text-ink border-paper-deep border-b"
			>
				{COPY.legal.privacy}
			</a>
		</p>
	);
}
