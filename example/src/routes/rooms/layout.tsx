import { init } from '@instantdb/core';
import { Divider, MultiSelect, Space, TextInput } from '@mantine/core';
import { useForm } from '@tanstack/react-form';
import { createFileRoute } from '@tanstack/react-router';
import { memo, useDeferredValue, useEffect, useState } from 'react';

import schema, { AllEntities } from '~client/db/instant.schema';
import { SearchableSelect, SearchableSelectProps } from '~client/lib/components/searchable-select';
import { db, entityNames } from '~client/main';
import { getEntityFields } from '~instantdb-react-ui/index';
import { NewField, NewForm, NewRelationField } from '~instantdb-react-ui/new-form/form';

// --------------------------------------------------------------------------------
// InstantDB Setup
export const coreDB = init({
	appId: import.meta.env.VITE_INSTANT_APP_ID,
	schema: schema,
});

// const personFields = getEntityFields(schema, 'persons');
const personFields = AllEntities.persons;
const itemFields = AllEntities.items;

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

			<p>Tanstack Form</p>
			<TanstackForm />
			<Divider my="xl" />

			<p>Auto Form</p>
			<NewForm id="c62637e9-2ba1-4f63-a74f-a06986596913" entity={entityNames.items}>
				<NewField fieldName={itemFields.name}>
					<TextInput label="Name" />
				</NewField>
				<NewRelationField fieldName={itemFields.room}>
					<CustomRoomPicker data={[]} />
				</NewRelationField>
				<NewRelationField fieldName={itemFields.owner}>
					<CustomOwnerPicker data={[]} />
				</NewRelationField>
			</NewForm>
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

const personId = '0060585b-d673-4b2b-ab13-a1c013fff617';

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
		coreDB.subscribeQuery({ persons: { $: { where: { id: personId } } } }, (resp) => {
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
		// <MemoizedInput
		// 	value={name}
		// 	onChange={e => db.transact(db.tx.persons[personId]!.update({ name: e.currentTarget.value }))}
		// />
		<TextInput
			value={name}
			onChange={(e) => {
				coreDB.transact(coreDB.tx.persons[personId]!.update({ name: e.target.value }));
			}}
			label="Test performance..."
			placeholder="Test performance..."
			className="w-full"
		/>
	);
}

const MemoizedInput = memo(function MemoizedInput({
	value,
	onChange,
}: {
	value: string
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
	console.log('rendering memoized input', value);

	return (
		<TextInput
			label="Test performance..."
			placeholder="Test performance..."
			className="w-full"
			value={value}
			onChange={onChange}
		/>
	);
});
