import { useCallback, useRef, useState } from 'react';
import { COPY } from '../copy';
import { useDismiss } from '../lib/useDismiss';
import { seePlans } from '../state/dialog';
import { useModels, type ModelChoice } from './context';

/**
 * The line under a tier's name: what choosing it means, and — only when it
 * cannot be chosen — why. A row never carries both a reason and a reproach.
 */
function noteFor(choice: ModelChoice): string {
	if (choice.tier === null) return COPY.adminOnly;
	if (choice.locked)
		return choice.note
			? `${choice.note} · ${COPY.model.requiresPro}`
			: COPY.model.requiresPro;
	if (choice.comingSoon) return choice.note;
	if (!choice.available) return COPY.noKey;
	return choice.note;
}

/**
 * `Omicron ▾`, inside the composer, beside the button that sends.
 *
 * It belongs to the question being written rather than to the app, which is
 * why it sits in the box and not in the header: the choice is part of asking,
 * and it is made at the moment of asking. There is one of these, because
 * there is one composer — the same instance is portalled between the home
 * screen and the dock, so the selection cannot fork.
 *
 * The menu opens **upward**. The composer is at the foot of the screen on
 * every layout, and a menu hung below it would open off the bottom of a phone.
 *
 * A tier a plan would open is listed rather than hidden, struck through and
 * unpickable, and pressing it opens the plans. It is the only place in the app
 * where a reader meets the paid plan without going looking for it, so it has
 * to be honest and it must not nag: no colour, no badge, and the reason said
 * once, quietly, in the same grey as everything else in the row.
 */
export function ModelPicker() {
	const { choices, selected, select, loading } = useModels();
	const [open, setOpen] = useState(false);
	const host = useRef<HTMLDivElement>(null);
	const close = useCallback(() => setOpen(false), []);
	useDismiss(host, open, close);

	const name = selected?.label ?? (loading ? '…' : COPY.modelsEmpty);

	return (
		<div ref={host} className="relative shrink-0">
			<button
				type="button"
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label={`${COPY.model.choose}: ${name}`}
				disabled={!selected && !loading}
				onClick={() => setOpen((was) => !was)}
				className="font-app text-small text-ink-soft hover:bg-paper-deep hover:text-ink flex max-w-[9rem] items-center gap-1 rounded-full px-2.5 py-1.5 leading-none transition-colors disabled:cursor-default disabled:opacity-35"
			>
				<span className="truncate">{name}</span>
				<span
					aria-hidden
					className={`text-[0.75em] transition-transform duration-200 ease-paper ${
						open ? 'rotate-180' : ''
					}`}
				>
					▾
				</span>
			</button>

			<div
				role="menu"
				hidden={!open}
				// Hung from the bottom of the trigger and squared off its right
				// edge, so it grows up and inward and never off a narrow screen.
				className="border-paper-deep bg-paper-lift absolute right-0 bottom-full z-(--z-menu) mb-2 w-[15rem] max-w-[calc(100cqw-2.5rem)] overflow-hidden rounded-xl border py-1 shadow-[0_-16px_34px_-24px_rgba(36,31,26,0.9)]"
			>
				{choices.map((choice) => {
					const inUse = choice.id === selected?.id;
					const shut = choice.locked;
					const dead = !choice.available && !shut;

					return (
						<button
							key={choice.id}
							role="menuitem"
							type="button"
							disabled={dead}
							onClick={() => {
								close();
								if (shut) seePlans();
								else select(choice.id);
							}}
							className="font-app flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left enabled:hover:bg-paper-deep disabled:cursor-default"
						>
							<span className="flex w-full items-baseline justify-between gap-3">
								<span
									className={`text-ui truncate ${
										choice.comingSoon ? 'line-through' : ''
									} ${
										choice.available
											? 'text-ink'
											: 'text-ink-faint line-through'
									}`}
								>
									{choice.label}
								</span>
								{inUse && (
									<span className="text-tiny text-ink-faint shrink-0">
										{COPY.inUse}
									</span>
								)}
							</span>
							{/* What choosing it means — and, only when it is out
							    of reach, the one reason it is. */}
							<span className="text-tiny text-ink-faint">
								{noteFor(choice)}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
