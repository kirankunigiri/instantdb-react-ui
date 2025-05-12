import { InstaQLEntity, InstaQLParams } from '@instantdb/react';
import { MultiSelect, Space, TextInput } from '@mantine/core';

import schema, { AppSchema } from '~client/db/instant.schema';
import { ReusableFormComponentProps } from '~client/lib/components/components';
import { SearchableSelect } from '~client/lib/components/searchable-select';
import { useRouteId } from '~client/lib/utils';
import { entityNames } from '~client/main';
import { IDBForm } from '~instantdb-react-ui/form/form';
import { createIdbEntityZodSchema } from '~instantdb-react-ui/form/zod';
import { getEntityFields, getErrorMessageForField, IDBField, IDBRelationField } from '~instantdb-react-ui/index';
import { useIDBForm2 } from '~instantdb-react-ui/new-form/use-idb-form2';

type Room = InstaQLEntity<typeof schema, 'rooms'>;
const personFields = getEntityFields(schema, 'persons');

const getPersonQuery = (id: string) => ({ persons: { $: { where: { id } }, room: {} } } satisfies InstaQLParams<AppSchema>);

function PersonForm({ type, children, ...props }: ReusableFormComponentProps) {
	const id = useRouteId();

	// const { zodSchema, defaults } = createIdbEntityZodSchema(schema, 'persons');
	// console.log('person defaulgts');
	// console.log(defaults);

	const personForm = useIDBForm2({
		idbOptions: {
			type: type,
			schema: schema,
			entity: 'persons',
			query: getPersonQuery(id),
			serverDebounceFields: { name: 500, email: 500 },
		},
		tanstackOptions: ({ handleIdbUpdate, handleIdbCreate, zodSchema }) => ({
			validators: { onChange: zodSchema },
			listeners: {
				onChange: ({ formApi, fieldApi }) => {
					if (type !== 'update') return;
					formApi.validate('change');
					if (formApi.state.isValid) handleIdbUpdate();
				},
			},
			onSubmit: handleIdbCreate,
		}),
	});

	return (
		<>
			<personForm.Field
				name="name"
				children={field => (
					<TextInput
						className={`${type === 'update' && !field.idb.synced ? 'unsynced' : ''}`}
						error={getErrorMessageForField(field)}
						label="Name"
						value={field.state.value}
						onChange={e => field.handleChange(e.target.value)}
					/>
				)}
			/>

			<personForm.Field
				name="email"
				children={field => (
					<TextInput
						className={`${type === 'update' && !field.idb.synced ? 'unsynced' : ''}`}
						error={getErrorMessageForField(field)}
						label="Email"
						value={field.state.value}
						onChange={e => field.handleChange(e.target.value)}
					/>
				)}
			/>

			<Space h="xs" />
			<personForm.Field
				name="room"
				children={(field) => {
					const linkData = field.idb.data || [];
					return (
						<SearchableSelect
							label="Room"
							value={field.state.value?.id}
							data={linkData.map(item => ({ label: item!.name, value: item!.id }))}
							onChange={(value) => {
								field.handleChange(linkData.find(item => item!.id === value)!);
							}}
						/>
					);
				}}
			/>

			{/* <IDBForm id={id} entity={entityNames.persons} type={type} {...props}>
				<IDBField fieldName={personFields.name}>
					<TextInput label="Name" />
				</IDBField>
				<IDBField fieldName={personFields.email}>
					<TextInput label="Email" />
				</IDBField>
				<IDBRelationField<Room> fieldName="room" setRelationPickerLabel={item => item.name}>
					<SearchableSelect label="Room" data={[]} />
				</IDBRelationField>
				{children}
			</IDBForm> */}
		</>
	);
}

export default PersonForm;
