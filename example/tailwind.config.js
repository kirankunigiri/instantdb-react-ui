/** @type {import('tailwindcss').Config} */
export default {
	darkMode: ['class', '[data-mantine-color-scheme="dark"]'],
	content: [
		'./index.html',
		'./src/**/*.{js,ts,jsx,tsx}',
	],
	theme: {
		extend: {
			colors: {
				'shadcn-darkest': 'var(--shadcn-darkest)',
				'shadcn-dark': 'var(--shadcn-dark)',
				'shadcn-light': 'var(--shadcn-light)',
				'sidebar-bg': 'var(--sidebar-bg)',
				'btn-default': 'var(--btn-default)',
				'btn-secondary': 'var(--btn-secondary)',
				'bd-light': 'var(--bd-light)',
				'bd-strong': 'var(--bd-strong)',
				'mantine-body': 'var(--mantine-color-body)',
			},
		},
	},
	plugins: [],
};
