import { createStore, useStore } from '../lib/store';

/**
 * The question being written, held outside the composer.
 *
 * The composer is one instance, portalled between the home screen and the
 * dock, but a portal whose container changes is a remount — and a remount that
 * drops the draft is exactly the moment a reader is most annoyed to lose it.
 */
const draft = createStore('');

export const useDraft = () => useStore(draft);
export const setDraft = (text: string) => draft.set(text);
