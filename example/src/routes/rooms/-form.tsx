import { InstaQLEntity, InstaQLParams } from '@instantdb/react';
import { Space, Textarea, TextInput } from '@mantine/core';
import { useNavigate } from '@tanstack/react-router';

import schema, { AppSchema } from '~client/db/instant.schema';
import { ReusableFormComponentProps } from '~client/lib/components/components';
import { SearchableSelect } from '~client/lib/components/searchable-select';
import SubmitButton from '~client/lib/components/submit';
import { useRouteId } from '~client/lib/utils';
import { useIDBForm2 } from '~instantdb-react-ui/form/use-idb-form';
import { getEntityFields, getErrorMessageForField } from '~instantdb-react-ui/index';

const getRoomQuery = (id: string) => ({ rooms: { $: { where: { id } } } } satisfies InstaQLParams<AppSchema>);

function RoomForm({ onValidSubmit, type }: ReusableFormComponentProps) {
	const id = useRouteId();
	const navigate = useNavigate();

	const personForm = useIDBForm2({
		idbOptions: {
			type: type,
			schema: schema,
			entity: 'rooms',
			query: getRoomQuery(id),
			serverDebounceFields: { name: 500, description: 500 },
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
				navigate({ to: '/rooms/$id', params: { id }, search: { search: '' } }); // nav to new room
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
				name="description"
				children={field => (
					<Textarea
						className={`${type === 'update' && !field.idb.synced ? 'unsynced' : ''}`}
						error={getErrorMessageForField(field)}
						label="Description"
						value={field.state.value}
						onChange={e => field.handleChange(e.target.value)}
					/>
				)}
			/>

			<SubmitButton type={type} form={personForm} />
		</>
	);
}

export default RoomForm;
