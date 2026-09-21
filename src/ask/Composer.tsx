import { useEffect, useLayoutEffect, useRef } from 'react';
import { COPY } from '../copy';
import { useConversation } from '../chat/context';
import { useFlag } from '../flags/context';
import { PlanNotice } from '../plan/PlanNotice';
import { standingOf, useAllowance } from '../state/allowance';
import { registerComposer } from '../state/composer';
import { setDraft, useDraft } from '../state/draft';

/**
 * One composer.
 *
 * It is a single instance whose position is a prop, not a copy: the home
 * screen and the dock each lend it a slot and it is portalled between them.
 * Two textareas would be two drafts, and the draft would be lost the first
 * time someone asked a question.
 */
export function Composer() {
	const { ask, busy, stop, failure } = useConversation();
	const draft = useDraft();
	const field = useRef<HTMLTextAreaElement>(null);

	// A month that is spent closes the composer rather than letting a question
	// be written and then refused. The flag gates the explanation, not the
	// limit — alexandria enforces that either way — so the field is only shut
	// when the reader can be told why it is shut.
	const explained = useFlag('isPlanLimitShown');
	const allowance = useAllowance();
	const spent = explained && standingOf(allowance) === 'spent';

	useEffect(() => {
		registerComposer(field.current);
		field.current?.focus();
		return () => registerComposer(null);
	}, []);

	// Grows with the question, up to eight lines of it.
	useLayoutEffect(() => {
		const element = field.current;
		if (!element) return;
		element.style.height = 'auto';
		element.style.height = `${element.scrollHeight}px`;
	}, [draft]);

	const submit = () => {
		const text = draft.trim();
		if (!text || busy || spent) return;
		setDraft('');
		ask(text);
	};

	return (
		<>
			<div className="border-paper-deep bg-paper-lift focus-within:border-edge flex items-end gap-2 rounded-2xl border px-2.5 py-2 pl-3.5 transition-[border-color,box-shadow] duration-200 focus-within:shadow-[0_6px_20px_-16px_rgba(36,31,26,0.8)]">
				<textarea
					ref={field}
					rows={1}
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter' && !event.shiftKey) {
							event.preventDefault();
							submit();
						}
					}}
					disabled={spent}
					placeholder={spent ? COPY.plan.spent : COPY.askPlaceholder}
					aria-label={COPY.askPlaceholder}
					className="font-read text-ask text-ink max-h-32 flex-1 resize-none border-0 bg-transparent py-1 font-light outline-none"
				/>
				{busy ? (
					<button
						type="button"
						onClick={stop}
						className="font-app text-small text-ink-soft hover:text-ink hover:bg-paper-deep rounded-full px-2.5 py-1.5 leading-none transition-colors"
					>
						{COPY.stop}
					</button>
				) : (
					<button
						type="button"
						onClick={submit}
						disabled={spent || !draft.trim()}
						className="font-app text-small text-ink-soft rounded-full px-2.5 py-1.5 leading-none transition-colors enabled:hover:bg-paper-deep enabled:hover:text-ink disabled:cursor-default disabled:opacity-35"
					>
						{COPY.ask}
					</button>
				)}
			</div>
			{failure && (
				<p className="font-app text-small text-rubric mt-1.5">
					{failure}
				</p>
			)}
			<PlanNotice />
		</>
	);
}
