import { useState } from 'react';
import type { WorkStep } from '../chat/message';

/**
 * What the model did, as against what it said.
 *
 * While it searches, this line is live and specific — *searching pages — “will
 * to truth”*, *reading Beyond Good and Evil, PDF pp. 19–23* — because watching a
 * good search is reassuring and watching a bad one is diagnostic. Once the
 * answer starts it collapses to one line, which anyone who wants to audit the
 * search can open again. There is no typing indicator of three dots: the
 * apparatus says what is happening, by name.
 */
export function Apparatus({
	work,
	summary,
	live,
}: {
	work: WorkStep[];
	summary: string;
	live: boolean;
}) {
	const [open, setOpen] = useState(false);
	if (work.length === 0) return null;

	if (live) {
		return (
			// Named steps are the only signal that anything is happening, so
			// they are announced rather than only shown.
			<div
				aria-live="polite"
				className="font-app text-small text-ink-soft mb-3"
			>
				{work.map((step) => (
					<div
						key={step.id}
						className={`animate-rise py-px ${step.running ? 'doing' : ''}`}
					>
						{step.label}
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="font-app text-small text-ink-soft mb-3">
			<button
				type="button"
				onClick={() => setOpen((was) => !was)}
				aria-expanded={open}
				className="text-ink-faint hover:text-ink inline-flex items-baseline gap-1.5 transition-colors"
			>
				<span
					aria-hidden
					className={`text-[0.75em] transition-transform duration-200 ease-paper ${
						open ? 'rotate-180' : ''
					}`}
				>
					▾
				</span>
				<span>{summary}</span>
			</button>
			{open && (
				<div className="border-paper-deep mt-1.5 border-l pt-1 pl-3">
					{work.map((step) => (
						<div key={step.id}>{step.label}</div>
					))}
				</div>
			)}
		</div>
	);
}
