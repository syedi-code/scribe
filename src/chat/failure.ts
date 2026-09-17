import { COPY } from '../copy';

/**
 * What a reader is told when an answer does not arrive.
 *
 * The server already names the failures a reader can act on, or wait out — out
 * of credit, rate limited, provider down — and streams that text rather than a
 * stack trace, so it is passed through as written. What it cannot name is the
 * connection dropping underneath it, which arrives as the fetch layer's own
 * wording and means nothing to anyone.
 */
const NETWORK = /failed to fetch|networkerror|load failed|network request/i;

export function describeStreamFailure(error: Error): string {
	if (NETWORK.test(error.message)) return COPY.offline;
	return error.message.trim() || COPY.answerFailed;
}
