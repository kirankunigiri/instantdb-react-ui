import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/about/')({
	component: AboutPage,
});

function AboutPage() {
	return (
		<div className="flex max-w-screen-md flex-col gap-4 p-4 px-6">
			<p className="text-2xl font-bold">About</p>
			<p>
				<code>instantdb-react-ui</code> is a React UI library for automating form generation with instantdb. It utilizes instantdb metadata to automatically generate forms and perform required queries and mutations.
			</p>
			<p>
				This is a demo website built with instantdb-react-ui to demonstrate its features.
			</p>
		</div>
	);
}
