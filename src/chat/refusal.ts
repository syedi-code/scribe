import { COPY } from '../copy';
import { reportAllowance } from '../state/allowance';
import type { Allowance } from '../api/types';

/**
 * A turn the month has no room for is refused with a 402 before anything is
 * streamed, and the transport would hand the reader that response's body as
 * the failure — raw JSON, printed under their question. The body carries the
 * allowance, so the counter learns the month is spent from the refusal
 * itself, and the reader is told why in words.
 */
export async function refuseSpentMonth(
	input: RequestInfo | URL,
	init?: RequestInit
): Promise<Response> {
	const response = await fetch(input, init);
	if (response.status !== 402) return response;
	const body = (await response.json().catch(() => null)) as {
		allowance?: Allowance;
	} | null;
	reportAllowance(body?.allowance);
	throw new Error(COPY.plan.refused);
}
