import { COPY } from '../copy';
import { AuthorName } from '../ui/AuthorName';
import type { Work } from '../api/types';

/**
 * The books an `@` could mean, over the composer. The field keeps the focus;
 * this is the listbox it points into, so a row is taken on pointer-down,
 * before the field could lose the focus and the menu with it.
 */
export function MentionMenu({
	id,
	options,
	index,
	onLight,
	onPick,
}: {
	id: string;
	options: Work[];
	index: number;
	onLight: (index: number) => void;
	onPick: (work: Work) => void;
}) {
	return (
		<div className="border-paper-deep bg-paper-lift animate-rise absolute inset-x-0 bottom-full z-(--z-menu) mb-2 origin-bottom rounded-2xl border p-1.5 shadow-[0_-8px_28px_-20px_rgba(36,31,26,0.55)]">
			<p className="font-app text-tiny text-ink-faint m-0 px-2.5 pt-1 pb-1.5">
				{options.length > 0 ? COPY.mention.caption : COPY.mention.none}
			</p>
			{options.length > 0 && (
				<ul
					id={id}
					role="listbox"
					aria-label={COPY.mention.caption}
					className="m-0 grid list-none gap-0.5 p-0"
				>
					{options.map((work, at) => (
						<li
							key={work.work_id}
							id={`${id}-${at}`}
							role="option"
							aria-selected={at === index}
							onPointerEnter={() => onLight(at)}
							onPointerDown={(event) => {
								event.preventDefault();
								onPick(work);
							}}
							className={`flex cursor-default flex-col gap-0.5 rounded-xl px-2.5 py-1.5 transition-colors ${
								at === index ? 'bg-paper-deep' : ''
							}`}
						>
							<span className="work-title text-ui text-ink truncate">
								{work.title}
							</span>
							<span className="font-app text-tiny text-ink-faint truncate">
								<AuthorName creator={work.creator} />
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
