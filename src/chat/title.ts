/**
 * A conversation's name, fit to sit in a rail one line high.
 *
 * The server asks for six words and gets one most of the time. The rest of
 * the time it gets an answer: production holds a conversation named
 * `# The Randomness of Two Books\n\n*Imagine I've pulled:*\n1. **"A Brief
 * History of Time"**…`, which is a whole Markdown document standing in for a
 * title, and the rail printed every character of it.
 *
 * alexandria trims this on the way in now. This is for the rows already
 * written, which no server-side fix reaches, and for the next model that
 * ignores the instruction in a way nobody has thought of yet.
 */

/** Everything a title is allowed to be: one line, no marks, no wrapper. */
export function cleanTitle(raw: string | null | undefined): string | null {
	if (!raw) return null;

	const line =
		raw
			.split('\n')
			.map((one) => one.replace(/^\s*#{1,6}\s*/, '').trim())
			.find((one) => one.replace(/[*_`>\-\s]/g, '') !== '') ?? '';

	const bare = line
		// The marks themselves, wherever they fall.
		.replace(/\*\*|__|[*_`]/g, '')
		.replace(/^\s*>\s*/, '')
		.replace(/^\s*(?:\d{1,3}[.)]|[-+])\s+/, '')
		// A title the model wrapped in quotes is still just the title.
		.replace(/^["“'](.+)["”']$/, '$1')
		.replace(/\s+/g, ' ')
		.replace(/[.,;:]+$/, '')
		.trim();

	if (!bare) return null;
	return bare.length > 72 ? `${bare.slice(0, 71).trimEnd()}…` : bare;
}
