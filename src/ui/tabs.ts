/**
 * `add` is not here. The tab is shown struck through and cannot be reached
 * until there is an ingestion behind it; `add/AddPanel.tsx` waits for one.
 *
 * `sessions` is a tab only under the compact breakpoint. Wide, the list is
 * the rail beside the page, and the tab bar does not offer it.
 *
 * `about` is offered only behind `isAboutShown`.
 */
export type Tab = 'sessions' | 'ask' | 'books' | 'about';
