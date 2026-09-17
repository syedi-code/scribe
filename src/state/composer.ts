let field: HTMLTextAreaElement | null = null;

/** `/` focuses the composer from anywhere; only the composer knows where it is. */
export const registerComposer = (element: HTMLTextAreaElement | null) => {
	field = element;
};

export const focusComposer = () => field?.focus();
