import { InstaQLResult } from '@instantdb/react';
import { Checkbox, Divider, MultiSelect, Select, Space, TextInput } from '@mantine/core';
import { useForm } from '@tanstack/react-form';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import schema, { AppSchema, ITEM_CATEGORY } from '~client/db/instant.schema';
import { SearchableSelect, SearchableSelectProps } from '~client/lib/components/searchable-select';
import { db } from '~client/main';
import { useIDBForm } from '~instantdb-react-ui/new-form/use-idbform';

const itemId = 'c62637e9-2ba1-4f63-a74f-a06986596913';
const personId = '0060585b-d673-4b2b-ab13-a1c013fff617';

// TODO: Need to pass in list of link fields to include (and make this typesafe)
// TODO: Alternate option - pass full query instead of entity name
// TODO: allow default value override like here

function TypedForm() {
	const itemForm = useIDBForm(schema, 'items', {
		defaultValues: {
			name: '',
			shareable: true,
			category: ITEM_CATEGORY.Other,
		},
		debounceValues: {
			shareable: 100,
		},
		query: {
			items: { room: {}, owner: { room: {} }, $: { where: { id: itemId } } },
		} },
	);

	// const personForm = useIDBForm(schema, 'persons', {
	// 	query: { persons: { $: { where: { id: personId } } } },
	// });

	return (
		<form className="flex flex-col gap-2">
			<p className="text-lg font-bold">Item Form</p>
			<itemForm.Field
				name="name"
				children={field => (
					<>
						<p>Synced: {JSON.stringify(field.idb.synced)}</p>
						<TextInput label="Name" value={field.state.value} onChange={e => field.idb.handleChange(e.target.value)} />
					</>
				)}
			/>
			<itemForm.Field
				name="shareable"
				children={field => (
					<Checkbox label="Shareable" checked={field.state.value} onChange={e => field.idb.handleChange(e.target.checked)} />
				)}
			/>
			<itemForm.Field
				name="room"
				children={(field) => {
					const linkData = field.idb.data || [];
					return (
						<Select clearable error={field.state.meta.errors.join(', ')} value={field.state.value?.id} data={linkData.map(item => ({ label: item!.name, value: item!.id }))} onChange={value => field.idb.handleChange(linkData.find(item => item!.id === value)!)} />
					);
				}}
			/>
			<itemForm.Field
				name="owner"
				children={(field) => {
					const linkData = field.idb.data || [];
					console.log(field.state.value?.map(item => item!.id));
					return (
						<MultiSelect label="Owner(s)" value={field.state.value?.map(item => item!.id)} data={linkData.map(item => ({ label: `${item!.email} - ${item.name}`, value: item!.id }))} onChange={value => field.idb.handleChange(linkData.filter(link => value.includes(link!.id)))} error={field.state.meta.errors.join(', ')} />
					);
				}}
			/>

			<Space h="lg" />
			<p className="text-lg font-bold">Person Form</p>
			{/* <personForm.Field
				name="name"
				children={field => <TextInput label="Name" value={field.state.value} onChange={e => field.idb.handleChange(e.target.value)} />}
			/>
			<personForm.Field
				name="email"
				children={field => <TextInput label="Name" value={field.state.value} onChange={e => field.idb.handleChange(e.target.value)} error={field.state.meta.errors.join(', ')} />}
			/> */}
		</form>
	);
}

export const Route = createFileRoute('/rooms')({
	component: RouteComponent,
});

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

function CustomRoomPicker(props: SearchableSelectProps) {
	const data = props.data.map(item => ({
		label: item.name,
		value: item.id,
	}));

	return (
		<SearchableSelect label="Room" {...props} data={data} onChange={value => props.onChange({ target: { value: value } })} />
	);
}

function CustomOwnerPicker(props: SearchableSelectProps) {
	const data = props.data.map(item => ({
		label: item.name,
		value: item.id,
	}));

	return (
		<MultiSelect label="Owner(s)" {...props} data={data} onChange={value => props.onChange({ target: { value: value } })} />
	);
}

function TanstackForm() {
	const form = useForm({
		defaultValues: {
			name: '',
			email: '',
		},
		defaultState: {
			fieldMeta: {
				email: {
					data: [],
				},
			},
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
