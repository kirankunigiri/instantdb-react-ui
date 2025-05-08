import { InstaQLParams } from '@instantdb/react';
import { Divider, MultiSelect, Select, Space, TextInput } from '@mantine/core';
import { FieldApi, ReactFormExtendedApi, useForm, useStore } from '@tanstack/react-form';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import schema from '~client/db/instant.schema';
import { db } from '~client/main';
import { useIDBForm2 } from '~instantdb-react-ui/new-form/use-idb-form2';
import { ExtractFormData } from '~instantdb-react-ui/new-form/use-idbform';

export const Route = createFileRoute('/rooms')({
	component: RouteComponent,
});

const itemId = 'c62637e9-2ba1-4f63-a74f-a06986596913';
const personId = '0060585b-d673-4b2b-ab13-a1c013fff617';

// TODO: Need to pass in list of link fields to include (and make this typesafe)
// TODO: allow default value override like here

const itemQuery = { items: { room: {}, owner: { room: {} }, $: { where: { id: itemId } } } } satisfies InstaQLParams<typeof schema>;

interface TestFormData {
	name: string
	id: string
}

function TypedForm() {
	// const testForm = useForm<TestFormData, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined>({
	// 	defaultValues: {
	// 		name: 'hello',
	// 	},
	// 	listeners: {
	// 		onChange: ({ formApi, fieldApi }) => {
	// 			formApi.setFieldValue('name', 'sdfsdf');
	// 			// autosave logic
	// 			console.log(formApi.state.isValid);
	// 			// fieldApi represents the field that triggered the event.
	// 			console.log(fieldApi.name, fieldApi.state.value);
	// 		},
	// 	},
	// });
	// testForm.setFieldValue('name', '234');

	const testForm2 = useIDBForm2({
		idbOptions: {
			type: 'update',
			schema: schema,
			entity: 'items',
			query: itemQuery,
			defaultValues: {
				name: 'Bob',
				shareable: false,
				category: 'Other',
			},
			linkPickerQueries: {
				// Optional: Define queries for relation fields
				owner: { persons: { $: { order: { name: 'asc' } } } },
				room: { rooms: { $: { order: { name: 'asc' } } } },
			},
		},
		tanstackOptions: handleIdbUpdate => ({
			listeners: {
				onChange: ({ formApi, fieldApi }) => {
					console.log('onchange listener triggered');

					handleIdbUpdate();
					// formApi.setFieldValue('name', 'sdfsdf');
					// console.log(formApi.state.isValid);
					// fieldApi represents the field that triggered the event.
					console.log(fieldApi.name, fieldApi.state.value);
				},
			},
		}),
	});

	console.log(testForm2.newTestString);

	// const testForm2 = useIDBForm2(handleIdbUpdate => ({
	// 	type: 'update',
	// 	schema: schema,
	// 	entity: 'items',
	// 	query: { items: { $: { where: { id: 'some-item-id' } } } },
	// 	defaultValues: {
	// 		name: '',
	// 		shareable: false,
	// 		category: 'Other',
	// 	},
	// 	linkPickerQueries: {
	// 		// Optional: Define queries for relation fields
	// 		owner: { persons: { $: { order: { name: 'asc' } } } },
	// 		room: { rooms: { $: { order: { name: 'asc' } } } },
	// 	},
	// 	listeners: {
	// 		onChange: ({ formApi, fieldApi }) => {
	// 			fieldApi.form.getFieldValue('');
	// 			// autosave logic
	// 			console.log(formApi.state.isValid);
	// 			// fieldApi represents the field that triggered the event.
	// 			console.log(fieldApi.name, fieldApi.state.value);
	// 		},
	// 	},
	// }));

	return (

		<>
			<p>Test Form 2</p>
			<testForm2.Field
				name="name"
				asyncDebounceMs={1000}
				children={field => (
					<TextInput
						value={field.state.value}
						onChange={e => field.handleChange(e.target.value)}
					/>
				)}
			/>
			<testForm2.Field
				name="room"
				children={(field) => {
					const linkData = field.idb.data || [];
					return (
						<Select
							label="Room"
							clearable
							error={field.state.meta.errors.join(', ')}
							value={field.state.value?.id}
							data={linkData.map(item => ({ label: item!.name, value: item!.id }))}
							onChange={(value) => {
								// TODO: This is broken, might need to await the handleChange
								testForm2.setFieldValue('owner', []);
								field.handleChange(linkData.find(item => item!.id === value)!);
							}}
						/>
					);
				}}
			/>

			{/* <Space h="lg" />
			<p className="text-lg font-bold">Person Form</p>
			<personForm.Field
				name="name"
				children={field => <TextInput label="Name" value={field.state.value} onChange={e => field.idb.handleChange(e.target.value)} />}
			/>
			<personForm.Field
				name="email"
				children={field => <TextInput label="Name" value={field.state.value} onChange={e => field.idb.handleChange(e.target.value)} error={field.state.meta.errors.join(', ')} />}
			/> */}
		</>
	);
}

type FormData = ExtractFormData<typeof schema, typeof itemQuery, 'items'>;

// TODO: Change owner filter based on the room
function OwnerField({ field, itemForm }: {
	field: FieldApi<FormData, 'owner'>
	itemForm: ReactFormExtendedApi<FormData>
}) {
	const room = useStore(itemForm.store, state => state.values.room);
	const linkData = field.idb.data || [];
	const filteredLinkData = linkData.filter(person => person.room!.id === room!.id);

	return (
		<MultiSelect
			label={`Owner(s) ${field.state.value?.map(item => item!.name).join(', ')}`}
			value={field.state.value?.map(item => item!.id)}
			data={filteredLinkData.map(item => ({ label: item!.name, value: item!.id }))}
			onChange={value => field.idb.handleChange(linkData.filter(link => value.includes(link!.id)))}
			error={field.state.meta.errors.join(', ')}
		/>
	);
}

function RouteComponent() {
	console.log('rendering route');

	return (
		<div className="w-full p-2">
			<p>Hardcoded Form</p>
			<HardcodedForm />
			<Space h="xl" />
			<Divider my="xl" />

			<p>Plain Input</p>
			<TextInput label="Name" />
			<Divider my="xl" />

			<p>Typed Form</p>
			<TypedForm />
			<Divider my="xl" />

			{/* <p>Auto Form</p>
			<NewForm id="c62637e9-2ba1-4f63-a74f-a06986596913" entity={entityNames.rooms}>
				<NewField fieldName={itemFields.name}>
					<TextInput label="Name" />
				</NewField>
				<NewRelationField fieldName={itemFields.room}>
					<CustomRoomPicker data={[]} />
				</NewRelationField>
				<NewRelationField fieldName={itemFields.owner}>
					<CustomOwnerPicker data={[]} />
				</NewRelationField>
				<NewRelationField
					fieldName={itemFields.owner}
					render={field => (
						<CustomOwnerPicker data={[]} />
					)}
				/>
			</NewForm> */}
		</div>
	);
}

function TanstackForm() {
	const form = useForm({
		defaultValues: {
			name: '',
			email: '',
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
		>
			<form.Field
				name="name"
				children={field => (
					<TextInput
						label="Name"
						name={field.name}
						value={field.state.value}
						onBlur={field.handleBlur}
						onChange={e => field.handleChange(e.target.value)}
					/>
				)}
			/>
		</form>
	);
}

function TestDBQuery() {
	const query = db.useQuery({
		persons: {
			$: { where: { id: personId } },
			room: {},
		},
	});

	const { data } = query;
	const person = data?.persons[0];
	if (!person) return null;
	console.log('fetching person with room', person.room);
}

function HardcodedForm() {
	console.log('rendering hardcoded form');
	// const query = db.useQuery({
	// 	persons: {
	// 	},
	// });

	// const { data } = query;
	// const person = data?.persons[0];
	// if (!person) return null;

	const [name, setName] = useState('');

	useEffect(() => {
		db._core.subscribeQuery({ persons: { $: { where: { id: personId } } } }, (resp) => {
			if (resp.error) {
				console.error(resp.error.message); // Pro-tip: Check you have the right appId!
				return;
			}
			if (resp.data) {
				const name = resp.data.persons[0]!.name as string;
				console.log('setting name', name);
				setName(name);
			}
		});
	}, []);

	return (
		<TextInput
			value={name}
			onChange={(e) => {
				db._core.transact(db.tx.persons[personId]!.update({ name: e.target.value }));
			}}
			label="Test performance..."
			placeholder="Test performance..."
			className="w-full"
		/>
	);
}
