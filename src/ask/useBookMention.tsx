import {
	useId,
	useLayoutEffect,
	useRef,
	useState,
	type KeyboardEvent,
	type RefObject,
} from 'react';
import { libraryWorks } from '../api/library';
import { useAsync } from '../lib/useAsync';
import { setDraft } from '../state/draft';
import { MentionMenu } from './MentionMenu';
import { insertMention, mentionAt, worksFor } from './mention';
import type { Work } from '../api/types';

/**
 * `@` in the composer, and the books it could mean (#51).
 *
 * The field keeps the focus throughout: the menu is a listbox the field
 * points into (`aria-activedescendant`), so arrows move through it, Enter or
 * Tab takes the one lit, and Escape puts it away until another `@` is typed.
 */
export function useBookMention(
	field: RefObject<HTMLTextAreaElement | null>,
	draft: string,
	enabled: boolean
) {
	const listId = useId();
	const [caret, setCaret] = useState(0);
	const [dismissed, setDismissed] = useState<number | null>(null);
	const [lit, setLit] = useState({ query: '', index: 0 });
	const placed = useRef<number | null>(null);
	const works = useAsync(enabled ? () => libraryWorks() : null, [enabled]);

	const typed = enabled ? mentionAt(draft, caret) : null;
	const mention = typed && typed.start !== dismissed ? typed : null;
	const options = mention ? worksFor(works.value ?? [], mention.query) : [];
	// Nothing found is worth saying while a title is being tried, not once
	// the reader has typed past it into a sentence.
	const unknown =
		mention !== null &&
		options.length === 0 &&
		mention.query.length > 0 &&
		!/\s/.test(mention.query) &&
		works.value !== null;
	const open = options.length > 0 || unknown;
	const index =
		lit.query === mention?.query
			? Math.min(lit.index, options.length - 1)
			: 0;

	// The caret goes after the inserted title once the field holds it.
	useLayoutEffect(() => {
		if (placed.current === null || !field.current) return;
		field.current.setSelectionRange(placed.current, placed.current);
		placed.current = null;
	}, [draft, field]);

	const pick = (work: Work) => {
		if (!mention) return;
		const next = insertMention(draft, mention, caret, work.title);
		placed.current = next.caret;
		setCaret(next.caret);
		setDraft(next.text);
	};

	return {
		/** Read the caret wherever it may have moved: typing, clicking, arrows. */
		track: () => setCaret(field.current?.selectionStart ?? 0),
		/** The keys the menu takes while it is open; true if one was taken. */
		onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>): boolean => {
			if (!open || !mention || event.nativeEvent.isComposing)
				return false;
			const move = (by: number) => {
				event.preventDefault();
				setLit({
					query: mention.query,
					index: (index + by + options.length) % options.length,
				});
			};
			const choosing = options.length > 0;
			if (choosing && event.key === 'ArrowDown') move(1);
			else if (choosing && event.key === 'ArrowUp') move(-1);
			else if (
				choosing &&
				(event.key === 'Enter' || event.key === 'Tab')
			) {
				event.preventDefault();
				pick(options[index]);
			} else if (event.key === 'Escape') {
				event.preventDefault();
				setDismissed(mention.start);
			} else return false;
			return true;
		},
		/** What the field says about the menu it controls, while there is one to control. */
		fieldProps: enabled
			? {
					'role': 'combobox' as const,
					'aria-autocomplete': 'list' as const,
					'aria-expanded': options.length > 0,
					'aria-controls': options.length > 0 ? listId : undefined,
					'aria-activedescendant':
						options.length > 0 ? `${listId}-${index}` : undefined,
				}
			: {},
		menu: open ? (
			<MentionMenu
				id={listId}
				options={options}
				index={index}
				onLight={(at) =>
					setLit({ query: mention?.query ?? '', index: at })
				}
				onPick={pick}
			/>
		) : null,
	};
}
