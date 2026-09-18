import { useState } from 'react';
import { COPY } from '../copy';
import type { WorkStep } from '../chat/message';
import { Waiting } from './Waiting';

/**
 * What the model did, as against what it said.
 *
 * Every tool call is a row, and a row stays once it exists: a search and a
 * read are facts, and a list that rewrites itself as the model changes its
 * mind is the opposite of the reassurance it is meant to give. The model's
 * narration is not shown at all — it is the model talking to itself.
 *
 * Colour is not used here. Three inks mean *how the evidence came back* and
 * nothing else in the app is coloured, so the hierarchy is carried by weight
 * and position: what it did, then to what, then what came back. A step still
 * running trails a sweeping rule — motion, not a fourth colour.
 */

function Step({ step }: { step: WorkStep }) {
	return (
		<li className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-2 py-[3px] @max-compact:grid-cols-1 @max-compact:gap-x-0">
			<span
				className={`text-ink-soft ${step.state === 'running' ? 'doing' : ''}`}
			>
				{step.action}
			</span>
			<span className="min-w-0">
				<span className="text-ink">{step.subject}</span>
				{step.result && (
					<>
						<span aria-hidden className="text-ink-faint px-1.5">
							·
						</span>
						<span
							className={
								step.state === 'failed'
									? 'text-ink-soft italic'
									: 'text-ink-faint'
							}
						>
							{step.result}
						</span>
					</>
				)}
			</span>
		</li>
	);
}

export function Apparatus({
	work,
	summary,
	live,
}: {
	work: WorkStep[];
	summary: string;
	live: boolean;
}) {
	const [opened, setOpened] = useState(false);
	if (work.length === 0) {
		return live ? <Waiting /> : null;
	}

	// While the model is working the steps are the whole story, so they stay
	// open. Once the answer is there they fold away, unless the reader has
	// asked to keep them.
	const open = live || opened;

	return (
		<div className="font-app text-small mb-3">
			<button
				type="button"
				onClick={() => setOpened((was) => !was)}
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
				<span>{live ? COPY.showWork : summary}</span>
			</button>

			{open && (
				<ul
					aria-live="polite"
					className="border-paper-deep mt-1.5 list-none border-l pl-3"
				>
					{work.map((step) => (
						<Step key={step.id} step={step} />
					))}
				</ul>
			)}
		</div>
	);
}
