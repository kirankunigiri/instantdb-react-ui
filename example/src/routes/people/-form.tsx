import { InstaQLEntity, InstaQLParams } from '@instantdb/react';
import { Space, TextInput } from '@mantine/core';
import { useNavigate } from '@tanstack/react-router';

import schema, { AppSchema } from '~client/db/instant.schema';
import { ReusableFormComponentProps2 } from '~client/lib/components/components';
import { SearchableSelect } from '~client/lib/components/searchable-select';
import SubmitButton from '~client/lib/components/submit';
import { useRouteId } from '~client/lib/utils';
import { getEntityFields, getErrorMessageForField } from '~instantdb-react-ui/index';
import { useIDBForm2 } from '~instantdb-react-ui/new-form/use-idb-form2';

type Room = InstaQLEntity<typeof schema, 'rooms'>;
const personFields = getEntityFields(schema, 'persons');

const getPersonQuery = (id: string) => ({ persons: { $: { where: { id } }, room: {} } } satisfies InstaQLParams<AppSchema>);

function PersonForm({ onValidSubmit, type }: ReusableFormComponentProps2) {
	const id = useRouteId();
	const navigate = useNavigate();

	// const { zodSchema, defaults } = createIdbEntityZodSchema(schema, 'persons');

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
			onSubmit: async () => {
				const id = await handleIdbCreate(); // create entity
				navigate({ to: '/people/$id', params: { id }, search: { search: '' } }); // nav to new person
				onValidSubmit?.(); // close modal
			},
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

			<SubmitButton type={type} form={personForm} />

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
