import { useCallback, useRef, useState } from 'react';
import { COPY } from '../copy';
import { useDismiss } from '../lib/useDismiss';
import { seePlans } from '../state/dialog';
import { BrandedLabel } from './BrandedLabel';
import { useModels, type ModelChoice } from './context';
import { TierMark } from './TierMark';

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
 * Its rows are inset and rounded inside the menu's own padding, so a row under
 * the pointer is a lozenge with air around it rather than a band ruled to the
 * edge — which left a sliver of unlit padding above the first row and below
 * the last, and read as a miss rather than as a margin.
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
				// `leading-none` clipped the descender of Omega's g, because
				// the name is set in the reading face and the line box was cut
				// to the cap height. The row is sized by its padding instead.
				className="text-ink-soft hover:bg-paper-deep hover:text-ink flex items-center gap-1.5 rounded-full px-2.5 py-1 text-small leading-normal whitespace-nowrap transition-colors disabled:cursor-default disabled:opacity-35"
			>
				<TierMark name={name} tier={selected?.tier} />
				<span
					aria-hidden
					className={`text-ink-faint ease-paper text-[0.7em] transition-transform duration-200 ${
						open ? 'rotate-180' : ''
					}`}
				>
					▾
				</span>
			</button>

			{open && (
				<div
					role="menu"
					// Hung from the top of the trigger and squared off its right
					// edge, so it grows up and inward and never off a narrow
					// screen. It rises as it fades, the way everything that
					// arrives over the page here does.
					className="border-paper-deep bg-paper-lift animate-rise absolute right-0 bottom-full z-(--z-menu) mb-2 w-[16rem] max-w-[calc(100cqw-2.5rem)] origin-bottom rounded-2xl border p-1.5 shadow-[0_-18px_38px_-26px_rgba(36,31,26,0.9)]"
				>
					{choices.map((choice) => {
						const inUse = choice.id === selected?.id;
						const shut = choice.locked;
						const dead = !choice.available && !shut;
						const struck = shut || dead;

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
								className="enabled:hover:bg-paper-deep flex w-full flex-col items-start gap-0.5 rounded-xl px-2.5 py-2 text-left transition-colors disabled:cursor-default"
							>
								<span className="flex w-full items-baseline justify-between gap-3">
									{choice.tier ? (
										<TierMark
											name={choice.label}
											// An ink says which tier this is;
											// out of reach, it is struck and
											// faint instead, because a colour
											// on something unpickable reads as
											// a state rather than a name.
											tier={struck ? null : choice.tier}
											className={`text-ui ${
												struck
													? 'text-ink-faint line-through'
													: ''
											}`}
										/>
									) : (
										<span className="font-app text-ui text-ink truncate">
											<BrandedLabel
												label={choice.label}
											/>
										</span>
									)}
									{inUse && (
										<span className="font-app text-tiny text-ink-faint shrink-0">
											{COPY.inUse}
										</span>
									)}
								</span>
								{/* What choosing it means — and, only when it is out
								    of reach, the one reason it is. */}
								<span className="font-app text-tiny text-ink-faint">
									{noteFor(choice)}
								</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
