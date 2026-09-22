/**
 * A Turnstile token, for making a visitor a guest.
 *
 * Cloudflare's script is loaded only here, only for a visitor with no
 * session, so a signed-in reader never fetches it. The widget runs in
 * `interaction-only` mode: most people never see it, and the few it wants a
 * click from see it in the slot `SessionGate` keeps on screen for it.
 */

const SCRIPT =
	'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
/** Past this, the visitor is let in as a visitor without a guest (`none`). */
const PATIENCE_MS = 20_000;

interface Turnstile {
	render(
		container: HTMLElement,
		options: {
			'sitekey': string;
			'appearance': 'interaction-only';
			'callback': (token: string) => void;
			'error-callback': () => void;
			'expired-callback': () => void;
		}
	): string;
	remove(widget: string): void;
}

declare global {
	interface Window {
		turnstile?: Turnstile;
	}
}

let loading: Promise<Turnstile> | null = null;

function loadScript(): Promise<Turnstile> {
	loading ??= new Promise<Turnstile>((resolve, reject) => {
		if (window.turnstile) return resolve(window.turnstile);
		const script = document.createElement('script');
		script.src = SCRIPT;
		script.async = true;
		script.onload = () =>
			window.turnstile
				? resolve(window.turnstile)
				: reject(new Error('Turnstile did not load'));
		script.onerror = () => {
			loading = null;
			reject(new Error('Turnstile could not be fetched'));
		};
		document.head.append(script);
	});
	return loading;
}

export async function turnstileToken(
	siteKey: string,
	slot: HTMLElement
): Promise<string> {
	const turnstile = await loadScript();
	return new Promise<string>((resolve, reject) => {
		let widget = '';
		const settle = (then: () => void) => {
			clearTimeout(timer);
			if (widget) turnstile.remove(widget);
			then();
		};
		const timer = setTimeout(
			() => settle(() => reject(new Error('Turnstile timed out'))),
			PATIENCE_MS
		);
		widget = turnstile.render(slot, {
			'sitekey': siteKey,
			'appearance': 'interaction-only',
			'callback': (token) => settle(() => resolve(token)),
			'error-callback': () =>
				settle(() => reject(new Error('Turnstile refused'))),
			'expired-callback': () =>
				settle(() => reject(new Error('Turnstile expired'))),
		});
	});
}
