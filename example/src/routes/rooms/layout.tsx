import { init, InstaQLParams } from '@instantdb/core';
import { InstaQLEntity, InstaQLResult } from '@instantdb/react';
import { Checkbox, Divider, MultiSelect, Space, TextInput } from '@mantine/core';
import { formOptions, useForm } from '@tanstack/react-form';
import { createFileRoute } from '@tanstack/react-router';
import { memo, useDeferredValue, useEffect, useState } from 'react';

import schema, { AllEntities, AppSchema, ITEM_CATEGORY } from '~client/db/instant.schema';
import { CheckboxWrapper } from '~client/lib/components/components';
import { SearchableSelect, SearchableSelectProps } from '~client/lib/components/searchable-select';
import { db, entityNames } from '~client/main';
import { getEntityFields } from '~instantdb-react-ui/index';
import { NewField, NewForm, NewRelationField } from '~instantdb-react-ui/new-form/form';
// import { useEntityForm } from '~instantdb-react-ui/new-form/use-form';
import { useEntityForm } from '~instantdb-react-ui/new-form/query-form';
import { useIDBForm } from '~instantdb-react-ui/new-form/use-idbform';
const itemId = 'c62637e9-2ba1-4f63-a74f-a06986596913';
const personId = '0060585b-d673-4b2b-ab13-a1c013fff617';
type Test = InstaQLEntity<AppSchema, 'items'>;

// TODO: Make this work with any schema
// export interface EntityForm<T extends keyof AppSchema['entities']> {
// 	Field: <K extends keyof EntityWithLinks<AppSchema, T>>(props: {
// 		name: K
// 		children: (field: {
// 			name: K
// 			state: {
// 				value: EntityWithLinks<AppSchema, T>[K] // This will now be properly typed
// 			}
// 			handleBlur: () => void
// 			handleChange: (value: EntityWithLinks<AppSchema, T>[K]) => void // This will now be properly typed
// 		}) => React.ReactElement
// 	}) => React.ReactElement
// 	handleSubmit: () => void
// }

// export function useEntityForm<T extends keyof AppSchema['entities']>(
// 	entity: T,
// 	options?: {
// 		defaultValues?: Partial<EntityWithLinks<AppSchema, T>>
// 	},
// ): EntityForm<T> {
// 	return {
// 		Field: ({ name, children }) => {
// 			// Now TypeScript knows the exact type for each field
// 			const value = options?.defaultValues?.[name] as EntityWithLinks<AppSchema, T>[typeof name];
// 			return children({
// 				name,
// 				state: { value },
// 				handleBlur: () => {},
// 				handleChange: (value: EntityWithLinks<AppSchema, T>[typeof name]) => {},
// 			});
// 		},
// 		handleSubmit: () => {},
// 	};
// }

// TODO: Need to pass in list of link fields to include (and make this typesafe)
// TODO: Alternate option - pass full query instead of entity name
// TODO: allow default value override like here

// async function testQuery(query: InstaQLParams<AppSchema>) {
// 	const result = {};
// 	return result;
// }
// testQuery({

// })

type ItemsWithRoomResult = InstaQLResult<AppSchema, { items: { room: {} } }>;

function TypedForm() {
	const form = useIDBForm(schema, 'items', {
		defaultValues: {
			name: '',
			shareable: true,
			category: ITEM_CATEGORY.Other,
		},
		query: {
			items: { room: {}, $: { where: { id: itemId } } },
		},
	});

	return (
		<>
			<form.Field
				name="name"
				children={field => (
					<>
						<p>{JSON.stringify(field.handleChangeUpdate)}</p>
						<p>Synced: {JSON.stringify(field.state.meta.synced)}</p>
						<p>IDB Meta: {JSON.stringify(field.idbMeta.synced)}</p>
						<TextInput label="Name" value={field.state.value} onChange={e => field.handleChangeUpdate(e.target.value)} />
					</>
				)}
			/>
			<form.Field
				name="shareable"
				children={field => (
					<Checkbox label="Shareable" checked={field.state.value} />
				)}
			/>
			<form.Field
				name="room"
				children={field => (
					<p>{JSON.stringify(field.state.value)}</p>
				)}
			/>
		</>
	);
}

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

			<p>Typed Form</p>
			<TypedForm />
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
				<NewRelationField
					fieldName={itemFields.owner}
					render={field => (
						<CustomOwnerPicker data={[]} />
					)}
				/>
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
		// <MemoizedInput
		// 	value={name}
		// 	onChange={e => db.transact(db.tx.persons[personId]!.update({ name: e.currentTarget.value }))}
		// />
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
