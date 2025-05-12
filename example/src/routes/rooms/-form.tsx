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

const getRoomQuery = (id: string) => ({ rooms: { $: { where: { id } } } } satisfies InstaQLParams<AppSchema>);

function RoomForm({ onValidSubmit, type }: ReusableFormComponentProps2) {
	const id = useRouteId();
	const navigate = useNavigate();

	const personForm = useIDBForm2({
		idbOptions: {
			type: type,
			schema: schema,
			entity: 'rooms',
			query: getRoomQuery(id),
			serverDebounceFields: { name: 500 },
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

			<SubmitButton type={type} form={personForm} />
		</>
	);
}

export default RoomForm;
