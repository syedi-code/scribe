import { useCallback, useRef, useState } from 'react';
import { COPY } from '../copy';
import { useDismiss } from '../lib/useDismiss';
import { BrandedLabel } from './BrandedLabel';
import { useModels } from './context';

/**
 * `running Claude Haiku 4.5 ▾` — the one line that says which model is
 * answering, and the only place a model is chosen.
 *
 * One component, rendered under the wordmark at home and in the header once a
 * conversation starts. There is no second switcher, and no corner of its own:
 * the model in use is never more than a glance away.
 */
export function RunningModel({ hero = false }: { hero?: boolean }) {
	const { choices, selected, select, loading } = useModels();
	const [open, setOpen] = useState(false);
	const host = useRef<HTMLSpanElement>(null);
	const close = useCallback(() => setOpen(false), []);
	useDismiss(host, open, close);

	const label = selected?.label ?? (loading ? '…' : COPY.modelsEmpty);

	return (
		<div
			className={`font-app text-ink-soft whitespace-nowrap ${
				hero ? 'text-[clamp(1.05rem,2.4vw,1.4rem)]' : 'text-small'
			}`}
		>
			{COPY.running}{' '}
			<span ref={host} className="relative inline-block">
				<button
					type="button"
					aria-haspopup="menu"
					aria-expanded={open}
					disabled={!selected}
					onClick={() => setOpen((was) => !was)}
					className="text-ink inline-flex max-w-[min(15rem,60cqw)] items-baseline border-b border-transparent leading-tight hover:border-paper-deep disabled:cursor-default"
				>
					<span className="truncate">
						<BrandedLabel label={label} />
					</span>
					<span
						aria-hidden
						className={`ml-1 inline-block text-[0.8em] transition-transform duration-200 ease-paper ${
							open ? 'rotate-180' : ''
						}`}
					>
						▾
					</span>
				</button>

				<div
					role="menu"
					hidden={!open}
					// Wide enough for the longest label and its note side by
					// side, and never wider than the app. Under the wordmark the
					// line is centred, so the menu is too — hung from its left
					// edge it ran off the right of a phone.
					className={`border-paper-deep bg-paper-lift absolute top-6 z-(--z-menu) w-[19rem] overflow-hidden whitespace-normal max-w-[calc(100cqw-2rem)] rounded-xl border py-1 shadow-[0_16px_34px_-24px_rgba(36,31,26,0.9)] ${
						hero ? 'left-1/2 -translate-x-1/2' : 'left-0'
					}`}
				>
					{choices.map((model) => {
						const inUse = model.id === selected?.id;
						return (
							<button
								key={model.id}
								role="menuitem"
								type="button"
								disabled={!model.available}
								onClick={() => {
									select(model.id);
									close();
								}}
								className="font-app text-ui flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left enabled:hover:bg-paper-deep disabled:cursor-default disabled:text-ink-faint"
							>
								<span className="flex min-w-0 items-baseline gap-2">
									<span
										className={`truncate ${model.comingSoon ? 'line-through' : ''} ${
											model.available ? '' : 'opacity-60'
										}`}
									>
										<BrandedLabel label={model.label} />
									</span>
								</span>
								<span className="text-tiny text-ink-faint shrink-0 whitespace-nowrap">
									{model.comingSoon
										? COPY.comingSoon
										: !model.available
											? COPY.noKey
											: inUse
												? COPY.inUse
												: ''}
								</span>
							</button>
						);
					})}
					<p className="font-app text-tiny text-ink-faint mt-1 border-t border-paper-deep px-3 pt-2 pb-1">
						{COPY.modelNote}
					</p>
				</div>
			</span>
		</div>
	);
}
