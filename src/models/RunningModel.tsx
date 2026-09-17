import { useCallback, useRef, useState } from 'react';
import { COPY } from '../copy';
import { useDismiss } from '../lib/useDismiss';
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
					className="text-ink border-b border-transparent leading-tight hover:border-paper-deep disabled:cursor-default"
				>
					{label}
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
					className="absolute top-6 left-0 z-25 w-62 rounded-xl border border-paper-deep bg-paper-lift py-1 shadow-[0_16px_34px_-28px_rgba(36,31,26,0.9)]"
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
								className="font-app text-ui flex w-full items-baseline justify-between gap-2 px-3 py-1 text-left enabled:hover:bg-paper-deep disabled:cursor-default disabled:text-ink-faint"
							>
								<span>{model.label}</span>
								<span className="text-tiny text-ink-faint">
									{!model.available
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
