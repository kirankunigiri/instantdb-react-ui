import { InstaQLParams } from '@instantdb/react';
import { Checkbox, MultiSelect, TextInput } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useStore } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import schema, { AppSchema, ITEM_CATEGORY } from '~client/db/instant.schema';
import { ReusableFormComponentProps } from '~client/lib/components/components';
import { SearchableSelect } from '~client/lib/components/searchable-select';
import SubmitButton from '~client/lib/components/submit';
import { useRouteId } from '~client/lib/utils';
import { db } from '~client/main';
import { ExtractFormDataType, useIDBForm } from '~instantdb-react-ui/form/use-idb-form';
import { getErrorMessageForField, IDBExtractFieldType, IDBExtractFormType } from '~instantdb-react-ui/index';

const getItemQuery = (id: string) => ({
	items: {
		room: {},
		owner: { room: {} }, $: { where: { id } },
	},
} satisfies InstaQLParams<AppSchema>);

const testQuery = {
	items: {
		room: {},
		owner: { room: {} }, $: { where: { id: '123' } },
	},
} satisfies InstaQLParams<AppSchema>;

function ItemForm({ onValidSubmit, type }: ReusableFormComponentProps) {
	const id = useRouteId();
	const navigate = useNavigate();

	// Example of how to create a zod schema for the item form in case you need it outside of useIDBForm
	// const { zodSchema, defaults } = createIdbEntityZodSchema(schema, 'items');

	const itemForm = useIDBForm({
		idbOptions: {
			type: type,
			schema: schema,
			// db: db,
			entity: 'items',
			// query: getItemQuery(id),
			query: {
				items: {
					room: {},
					owner: { room: {} }, $: { where: { id } },
				},
			},
			// Optional. Prioritizes custom overrides (here) -> zod defaults -> instant defaults
			// defaultValues: {
			// 	name: '',
			// 	shareable: true,
			// 	category: ITEM_CATEGORY.Other,
			// },
			// serverDebounceFields: {
			// 	name: 500,
			// },
			// Optional: Define queries for relation fields
			linkPickerQueries: 'owner',
			// linkPickerQueries: {
			// 	// Owner picker - get list of all people and their rooms (to filter by room later)
			// 	owner: {
			// 		persons: {
			// 			room: {},
			// 			$: { order: { name: 'asc' } },
			// 		},
			// 	},
			// 	// Room picker - get list of all rooms
			// 	room: {
			// 		rooms: {
			// 			items: {},
			// 			$: { order: { name: 'asc' } },
			// 		},
			// 	},
			// },
		},
		tanstackOptions: ({ handleIdbUpdate, handleIdbCreate, zodSchema }) => ({
			validators: { onChange: zodSchema },
			listeners: {
				onChange: ({ formApi, fieldApi }) => {
					if (type !== 'update') return;
					formApi.validate('change');
					if (formApi.state.isValid) handleIdbUpdate();
					// fieldApi represents the field that triggered the event.
					// console.log(fieldApi.name, fieldApi.state.value);
				},
			},
			onSubmit: async ({ value }) => {
				try {
					console.log('submitting: ', value);

					const id = await handleIdbCreate(); // create entity
					if (!id) throw new Error('Failed to create entity');
					navigate({ to: '/items/$id', params: { id }, search: { search: '' } }); // nav to new person
					onValidSubmit?.(); // close modal
				} catch (error: unknown) {
					let message = 'Error submitting form';
					if (error instanceof Error && error.message) message += `: ${error.message}`;
					toast.error(message);
				}
			},
		}),
	});

	return (
		<div className="flex flex-col gap-1">
			<itemForm.Field
				name="name"
				children={field => (
					<TextInput
						className={`${type === 'update' && !field.state.meta.idbSynced ? 'unsynced' : ''}`}
						error={getErrorMessageForField(field)}
						label={`Name ${type === 'update' ? (field.state.meta.idbSynced ? '(Synced)' : '(Unsynced)') : ''}`}
						value={field.state.value}
						onChange={e => field.handleChange(e.target.value)}
					/>
				)}
			/>
			<itemForm.Field
				name="shareable"
				children={field => (
					<Checkbox
						label="Shareable"
						checked={field.state.value}
						onChange={e => field.handleChange(e.target.checked)}
						my="xs"
					/>
				)}
			/>
			<itemForm.Field
				name="category"
				children={field => (
					<SearchableSelect
						error={getErrorMessageForField(field)}
						label="Category"
						value={field.state.value}
						onChange={value => field.handleChange(value as ITEM_CATEGORY)}
						data={Object.values(ITEM_CATEGORY).map(category => ({ label: category, value: category }))}
					/>
				)}
			/>
			<itemForm.Field
				name="room"
				children={(field) => {
					const linkData = field.state.meta.idbLinkData || [];
					return (
						<SearchableSelect
							label="Room"
							value={field.state.value?.id}
							data={linkData.map(item => ({ label: item!.name, value: item!.id }))}
							onChange={(value) => {
								itemForm.setFieldValue('owner', []);
								field.handleChange(linkData.find(item => item!.id === value)!);
							}}
						/>
					);
				}}
			/>

			<itemForm.Field
				name="owner"
				children={field => <OwnerField field={field} form={itemForm} />}
			/>

			<itemForm.Field
				name="date"
				children={field => (
					<DatePickerInput
						label="Purchase Date"
						value={new Date(field.state.value)}
						onChange={value => field.handleChange(value?.getTime() ?? Date.now())}
						error={getErrorMessageForField(field)}
					/>
				)}
			/>

			<SubmitButton type={type} form={itemForm} />
		</div>
	);
}

type ItemFormDataType = ExtractFormDataType<AppSchema, ReturnType<typeof getItemQuery>, 'items'>;

function OwnerField({ field, form }: {
	field: IDBExtractFieldType<ItemFormDataType, 'owner'>
	form: IDBExtractFormType<ItemFormDataType>
}) {
	const room = useStore(form.store, state => state.values.room);
	const disabled = !room;
	const roomId = room ? room.id : '';
	const linkData = field.state.meta.idbLinkData || [];
	const filteredLinkData = linkData.filter(person => person.room!.id === roomId);

	return (
		<MultiSelect
			disabled={disabled}
			label="Owner(s)"
			value={field.state.value?.map(item => item!.id)}
			data={filteredLinkData.map(item => ({ label: item!.name, value: item!.id }))}
			onChange={(value) => {
				field.handleChange(linkData.filter(link => value.includes(link!.id)));
			}}
			error={getErrorMessageForField(field)}
		/>
	);
}

export default ItemForm;
