import { useEffect, useLayoutEffect, useRef } from 'react';
import { COPY } from '../copy';
import { useConversation } from '../chat/context';
import { useFlag } from '../flags/context';
import { ModelPicker } from '../models/ModelPicker';
import { PlanNotice } from '../plan/PlanNotice';
import { standingOf, useAllowance } from '../state/allowance';
import { registerComposer } from '../state/composer';
import { setDraft, useDraft } from '../state/draft';
import { openSignIn } from '../state/dialog';
import { useStanding } from '../state/visitor';

/**
 * One composer.
 *
 * It is a single instance whose position is a prop, not a copy: the home
 * screen and the dock each lend it a slot and it is portalled between them.
 * Two textareas would be two drafts, and the draft would be lost the first
 * time someone asked a question.
 *
 * The model switcher lives in here, on the row under the question, because
 * choosing who answers is part of asking and is done at the moment of asking.
 * It used to sit under the wordmark and again in the header, which put a
 * standing statement about the app where a choice about this question belongs.
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
	// A visitor's closed composer is always explained, by VisitorNotice.
	const spent =
		(explained || Boolean(allowance?.guest)) &&
		standingOf(allowance) === 'spent';
	const standing = useStanding();

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
		// A visitor we could not let in as a guest: the question is kept, and
		// the way to ask it is to sign in.
		if (standing === 'none') {
			openSignIn('blocked');
			return;
		}
		setDraft('');
		ask(text);
	};

	return (
		<>
			<div
				className={`border-paper-deep focus-within:border-edge ${
					spent ? 'bg-paper' : 'bg-paper-lift'
				} flex flex-col gap-1 rounded-2xl border px-2 py-2 transition-[border-color,box-shadow,background-color] duration-200 focus-within:shadow-[0_6px_20px_-16px_rgba(36,31,26,0.8)]`}
			>
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
					placeholder={
						spent && allowance?.guest
							? COPY.visitor.placeholder
							: spent && allowance?.resets_at
								? COPY.plan.back(allowance.resets_at)
								: COPY.askPlaceholder
					}
					aria-label={COPY.askPlaceholder}
					className="font-read text-ask text-ink max-h-32 w-full resize-none border-0 bg-transparent px-1.5 py-1 font-light outline-none"
				/>
				{/* The controls sit under the question rather than beside it:
				    which model answers is part of asking, and a row of its own
				    keeps the field the full width at every size — beside the
				    field, the two of them left a phone about twelve characters. */}
				<div className="flex items-center justify-end gap-1">
					<ModelPicker />
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
