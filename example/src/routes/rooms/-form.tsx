import { InstaQLParams } from '@instantdb/react';
import { Textarea, TextInput } from '@mantine/core';
import { useNavigate } from '@tanstack/react-router';

import schema, { AppSchema } from '~client/db/instant.schema';
import { ReusableFormComponentProps } from '~client/lib/components/components';
import SubmitButton from '~client/lib/components/submit';
import { useRouteId } from '~client/lib/utils';
import { db } from '~client/main';
import { useIDBForm } from '~instantdb-react-ui/form/use-idb-form';
import { getErrorMessageForField } from '~instantdb-react-ui/index';

const getRoomQuery = (id: string) => ({ rooms: { $: { where: { id } } } } satisfies InstaQLParams<AppSchema>);

function RoomForm({ onValidSubmit, type }: ReusableFormComponentProps) {
	const id = useRouteId();
	const navigate = useNavigate();

	const personForm = useIDBForm({
		idbOptions: {
			type: type,
			schema: schema,
			db: db,
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
				if (!id) throw new Error('Failed to create room');
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
						className={`${type === 'update' && !field.state.meta.idbSynced ? 'unsynced' : ''}`}
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
						className={`${type === 'update' && !field.state.meta.idbSynced ? 'unsynced' : ''}`}
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
