import { CodeHighlight } from '@mantine/code-highlight';
import { Divider, ScrollArea, Space, TextInput } from '@mantine/core';
import { useForm } from '@tanstack/react-form';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import schema from '~client/db/instant.schema';
import { db } from '~client/main';
import { useIDBForm2 } from '~instantdb-react-ui/new-form/use-idb-form2';

export const Route = createFileRoute('/compare')({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex size-full gap-4 p-4">
			<ScrollArea className="flex-1 rounded-md border border-bd-light p-4">
				<p className="text-lg font-bold">instantdb-react-ui Form</p>
				<p className="text-sm text-gray-500">A form that uses instantdb-react-ui to render a single field on the Items table.</p>
				<InstantdbReactUiForm />
				<Divider my="md" />
				<p className="my-2 text-sm text-gray-500">Below is the source code. This example uses a single field for simplicity, but as you add more fields, this library will become much more useful and keep your form code easier to maintain. Note how you never have to write manual db mutations or updating the form state when the query data changes.</p>
				<CodeHighlight code={instantdbReactUiFormCode} language="tsx" />
			</ScrollArea>

			<ScrollArea className="flex-1 rounded-md border border-bd-light p-4">
				<p className="text-lg font-bold">Manual Form</p>
				<p className="text-sm text-gray-500">A form that uses a manual query with Tanstack Form to render a single field on the Items table.</p>
				<ManualForm />
				<Divider my="md" />
				<p className="my-2 text-sm text-gray-500">Below is the source code. Note how you manually have to write form state logic and db mutations. Although it seems simple now, you would have to write these handlers for every single field in the form. This example is also missing the ability to reuse the same code for the create form, automatic zod schema validation, debouncing, and much more which you would have to implement manually.</p>
				<CodeHighlight code={manualFormCode} language="tsx" />
			</ScrollArea>
		</div>
	);
}

function InstantdbReactUiForm() {
	const form = useIDBForm2({
		idbOptions: {
			type: 'update',
			schema: schema,
			entity: 'items',
			query: { items: { $: { limit: 1 } } },
		},
		tanstackOptions: ({ handleIdbUpdate, zodSchema }) => ({
			validators: { onChange: zodSchema },
			listeners: {
				onChange: ({ formApi }) => {
					formApi.validate('change');
					if (formApi.state.isValid) handleIdbUpdate();
				},
			},
		}),
	});

	return (
		<div>
			<form.Field
				name="name"
				children={field => (
					<TextInput
						label="Name"
						name={field.name}
						value={field.state.value}
						onChange={e => field.handleChange(e.target.value)}
					/>
				)}
			/>
		</div>
	);
}

function ManualForm() {
	const query = db.useQuery({
		items: {
			$: { limit: 1 },
		},
	});

	const form = useForm({
		defaultValues: {
			name: '',
		},
	});

	const { data, isLoading } = query;
	const item = data?.items[0];

	useEffect(() => {
		if (item) form.setFieldValue('name', item.name);
	}, [item, form]);

	if (isLoading) return <div>Loading...</div>;

	const handleChange = (value: string) => {
		if (!item) return;
		db.transact(db.tx.items[item.id]!.update({ name: value }));
	};

	return (
		<div>
			<form.Field
				name="name"
				children={field => (
					<TextInput
						label="Name"
						name={field.name}
						value={field.state.value}
						onChange={e => handleChange(e.target.value)}
					/>
				)}
			/>
		</div>
	);
}

const instantdbReactUiFormCode = `
function InstantdbReactUiForm() {
	const form = useIDBForm2({
		idbOptions: {
			type: 'update',
			schema: schema,
			entity: 'items',
			query: { items: { $: { limit: 1 } } },
		},
		tanstackOptions: ({ handleIdbUpdate, zodSchema }) => ({
			validators: { onChange: zodSchema },
			listeners: {
				onChange: ({ formApi }) => {
					formApi.validate('change');
					if (formApi.state.isValid) handleIdbUpdate();
				},
			},
		}),
	});

	return (
		<div>
			<form.Field
				name="name"
				children={field => (
					<TextInput
						label="Name"
						name={field.name}
						value={field.state.value}
						onChange={e => field.handleChange(e.target.value)}
					/>
				)}
			/>
		</div>
	);
}
`;

const manualFormCode = `
function ManualForm() {
	const query = db.useQuery({
		items: {
			$: { limit: 1 },
		},
	});

	const form = useForm({
		defaultValues: {
			name: '',
		},
	});

	const { data, isLoading } = query;
	const item = data?.items[0];

	useEffect(() => {
		if (item) form.setFieldValue('name', item.name);
	}, [item, form]);

	if (isLoading) return <div>Loading...</div>;

	const handleChange = (value: string) => {
		if (!item) return;
		db.transact(db.tx.items[item.id]!.update({ name: value }));
	};

	return (
		<div>
			<form.Field
				name="name"
				children={field => (
					<TextInput
						label="Name"
						name={field.name}
						value={field.state.value}
						onChange={e => handleChange(e.target.value)}
					/>
				)}
			/>
		</div>
	);
}
`;
