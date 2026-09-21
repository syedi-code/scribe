import { ChatProvider } from './chat/ChatProvider';
import { FlagProvider } from './flags/FlagProvider';
import { ModelProvider } from './models/ModelProvider';
import { AppFrame } from './ui/AppFrame';
import { SessionGate } from './ui/SessionGate';

/**
 * scribe-lm.
 *
 * The session is opened before anything else is mounted, the feature flags,
 * the model roster and the conversation are provided around the shell, and
 * that is the whole of the root. Every decision below it belongs to whatever
 * makes it.
 */
export function App() {
	return (
		<SessionGate>
			<FlagProvider>
				<ModelProvider>
					<ChatProvider>
						<AppFrame />
					</ChatProvider>
				</ModelProvider>
			</FlagProvider>
		</SessionGate>
	);
}
