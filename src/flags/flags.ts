/**
 * Feature flags: booleans decided on the server, read once by the browser.
 *
 * A flag is an environment variable on the Pages project — `FLAG_…` — so a
 * feature can be turned on or off in production by flipping a variable and
 * redeploying, without a change to the code that reads it. The browser asks
 * `GET /api/flags`; `functions/api/flags.ts` answers out of the environment.
 *
 * This module is the one place a flag is named. It is read by the Pages
 * Function, by vite's dev server and by the app, so the name of the variable,
 * the name of the flag and what it falls back to cannot drift apart.
 *
 * A flag falls back to *off*. An unset variable is a deployment that has never
 * heard of this feature, and a feature nobody turned on should not be running.
 */

export interface Flags {
	/** Whether Claude Haiku 4.5 can be chosen in the model switcher. */
	isClaudeHaikuEnabled: boolean;
	/**
	 * Whether a reader is shown what is left of their month, and what a paid
	 * plan would give them. The limit is enforced by alexandria whether this
	 * is on or off; held back, a refused turn still says why, it just says it
	 * for the first time at the moment of refusal.
	 */
	isPlanLimitShown: boolean;
	/**
	 * Whether the reader's own corner is in the header: who is signed in,
	 * what they are on, and the way to sign out.
	 */
	isAccountShown: boolean;
}

interface Flag {
	/** The environment variable that carries it, on Pages and in dev. */
	env: string;
	/** What it means when the variable is unset or unreadable. */
	fallback: boolean;
}

export const FLAGS: Record<keyof Flags, Flag> = {
	isClaudeHaikuEnabled: {
		env: 'FLAG_IS_CLAUDE_HAIKU_ENABLED',
		fallback: false,
	},
	isPlanLimitShown: {
		env: 'FLAG_IS_PLAN_LIMIT_SHOWN',
		fallback: false,
	},
	isAccountShown: {
		env: 'FLAG_IS_ACCOUNT_SHOWN',
		fallback: false,
	},
};

/**
 * What a variable may say. Wrangler stores every var as a string, and whoever
 * sets one writes `true`, `1` or `on` depending on the day, so all three are
 * read. Anything else is not an answer and the fallback stands — a typo must
 * never read as *on*.
 */
const ON = new Set(['1', 'true', 'on', 'yes', 'enabled']);
const OFF = new Set(['0', 'false', 'off', 'no', 'disabled', '']);

export function readFlags(
	env: Record<string, unknown> | undefined | null
): Flags {
	const flags = {} as Flags;
	for (const [name, flag] of Object.entries(FLAGS) as [keyof Flags, Flag][]) {
		const raw = env?.[flag.env];
		const said =
			typeof raw === 'string' || typeof raw === 'number'
				? String(raw).trim().toLowerCase()
				: null;
		flags[name] =
			said === null
				? flag.fallback
				: ON.has(said)
					? true
					: OFF.has(said)
						? false
						: flag.fallback;
	}
	return flags;
}

/** Every flag off, or whatever it falls back to: what the app assumes until `/flags` lands. */
export const DEFAULT_FLAGS: Flags = readFlags(null);
