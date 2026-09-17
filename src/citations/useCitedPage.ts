import { loadDocument } from '../api/documents';
import { useAsync } from '../lib/useAsync';
import { pageFromDocument } from './page';
import type { AnswerCitation, CitedPage } from '../api/types';

/**
 * Which book a citation is about.
 *
 * From the citation itself once the server sends `page`, and from the document
 * behind its `ref` until then. A citation whose handle was never shown to the
 * model has no page at all, and gets none here either.
 */
export function useCitedPage(citation: AnswerCitation | null): {
	page: CitedPage | null;
	loading: boolean;
} {
	const known = citation?.page ?? null;
	const ref = citation?.ref ?? null;
	const fetched = useAsync(
		known || !ref
			? null
			: () =>
					loadDocument(ref.document_id).then((document) =>
						pageFromDocument(ref, document)
					),
		[known, ref?.document_id, ref?.page_no]
	);

	return {
		page: known ?? fetched.value,
		loading: fetched.loading,
	};
}
