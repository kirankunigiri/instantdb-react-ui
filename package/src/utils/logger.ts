// logger.ts
const LIB_NAMESPACE = 'instantdb-react-ui';

export function setIDBReactUIDebugMode(mode: boolean) {
	if (typeof window !== 'undefined') {
		localStorage.setItem(`${LIB_NAMESPACE}:debug`, mode.toString());
	} else if (typeof process !== 'undefined') {
		process.env.DEBUG = mode ? LIB_NAMESPACE : '';
	}
}

function isEnabled() {
	if (typeof window !== 'undefined') {
		return localStorage.getItem(`${LIB_NAMESPACE}:debug`) === 'true';
	} else if (typeof process !== 'undefined') {
		return process.env.DEBUG === LIB_NAMESPACE;
	}
	return false;
}

function format(prefix: string, args: unknown[]) {
	return [`[${LIB_NAMESPACE}] [${prefix}]`, ...args];
}

export const logger = {
	log: (...args: unknown[]) => {
		if (isEnabled()) console.log(...format('log', args));
	},
	warn: (...args: unknown[]) => {
		if (isEnabled()) console.warn(...format('warn', args));
	},
	error: (...args: unknown[]) => {
		if (isEnabled()) console.error(...format('error', args));
	},
	info: (...args: unknown[]) => {
		if (isEnabled()) console.info(...format('info', args));
	},
};
