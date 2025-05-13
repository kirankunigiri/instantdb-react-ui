import { CodeHighlight } from '@mantine/code-highlight';
import { Divider, TextInput } from '@mantine/core';
import { useForm } from '@tanstack/react-form';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import schema from '~client/db/instant.schema';
import { db } from '~client/main';
import { useIDBForm } from '~instantdb-react-ui/form/use-idb-form';

export const Route = createFileRoute('/compare')({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex size-full gap-4 p-4">
			<div className="w-1/2 shrink-0 rounded-md border border-bd-light p-4">
				<div className="flex h-full flex-col">
					<div>
						<p className="text-lg font-bold">instantdb-react-ui Form</p>
						<p className="text-sm text-gray-500">A form that uses instantdb-react-ui to render a single field on the Items table.</p>
						<InstantDBReactUIForm />
						<Divider my="md" />
						<p className="my-2 text-sm text-gray-500">Below is the source code. This example uses a single field for simplicity, but as you add more fields, this library will become much more useful and keep your form code easier to maintain. Note how you never have to write manual db mutations or update the form state when the query data changes.</p>
					</div>
					<div className="flex-1 overflow-hidden">
						<div className="h-full overflow-auto">
							<CodeHighlight withCopyButton={false} code={instantdbReactUiFormCode} language="tsx" className="w-full" />
						</div>
					</div>
				</div>
			</div>

			<div className="w-1/2 shrink-0 rounded-md border border-bd-light p-4">
				<div className="flex h-full flex-col">
					<div>
						<p className="text-lg font-bold">Manual Form</p>
						<p className="text-sm text-gray-500">A form that uses a manual query with Tanstack Form to render a single field on the Items table.</p>
						<ManualForm />
						<Divider my="md" />
						<p className="my-2 text-sm text-gray-500">Below is the source code. Note how you manually have to write form state logic and db mutations. Although it seems simple now, you would have to write these handlers for every single field in the form. This example is also missing the ability to reuse the same code for the create form, automatic zod schema validation, debouncing, and much more which you would have to implement manually.</p>
					</div>
					<div className="flex-1 overflow-hidden">
						<div className="h-full overflow-auto">
							<CodeHighlight withCopyButton={false} code={manualFormCode} language="tsx" className="w-full" />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function InstantDBReactUIForm() {
	const form = useIDBForm({
		idbOptions: {
			type: 'update',
			schema: schema,
			db: db,
			entity: 'items',
			query: { items: { $: { limit: 1 } } },
		},
		tanstackOptions: ({ handleIDBUpdate, zodSchema }) => ({
			validators: { onChange: zodSchema },
			listeners: {
				onChange: ({ formApi }) => {
					formApi.validate('change');
					console.log(formApi.state.values);
					if (formApi.state.isValid) handleIDBUpdate();
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
		items: { $: { limit: 1 } },
	});

	const form = useForm({
		defaultValues: { name: '' },
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
function InstantDBReactUIForm() {
	const form = useIDBForm({
		idbOptions: {
			type: 'update',
			schema: schema,
			db: db,
			entity: 'items',
			query: { items: { $: { limit: 1 } } },
		},
		tanstackOptions: ({ handleIDBUpdate, zodSchema }) => ({
			validators: { onChange: zodSchema },
			listeners: {
				onChange: ({ formApi }) => {
					formApi.validate('change');
					console.log(formApi.state.values);
					if (formApi.state.isValid) handleIDBUpdate();
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
		items: { $: { limit: 1 } },
	});

	const form = useForm({
		defaultValues: { name: '' },
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
