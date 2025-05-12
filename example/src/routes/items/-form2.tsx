import { InstantUnknownSchema, InstaQLParams } from '@instantdb/react';
import { Button, Checkbox, Divider, MultiSelect, NumberInput, Space, TextInput } from '@mantine/core';
import { FieldApi, FormApi, useForm, useStore } from '@tanstack/react-form';
import { toast } from 'sonner';
import { z } from 'zod';

import schema, { AppSchema, ITEM_CATEGORY } from '~client/db/instant.schema';
import { ReusableFormComponentProps2 } from '~client/lib/components/components';
import { SearchableSelect } from '~client/lib/components/searchable-select';
import { useRouteId } from '~client/lib/utils';
import { createIdbEntityZodSchema } from '~instantdb-react-ui/form/zod';
import { ExtractFormData, getErrorMessageForField } from '~instantdb-react-ui/index';
import { useIDBForm2 } from '~instantdb-react-ui/new-form/use-idb-form2';

const getItemQuery = (id: string) => ({ items: { room: {}, owner: { room: {} }, $: { where: { id } } } } satisfies InstaQLParams<AppSchema>);
type FormData = ExtractFormData<AppSchema, ReturnType<typeof getItemQuery>, 'items'>;

function ItemForm2({ onValidSubmit, type }: ReusableFormComponentProps2) {
	const id = useRouteId();

	// const { zodSchema, defaults } = createIdbEntityZodSchema(schema, 'items');

	const itemForm = useIDBForm2({
		idbOptions: {
			type: type,
			schema: schema,
			entity: 'items',
			query: getItemQuery(id),
			// Optional. Prioritizes custom overrides (here) -> zod defaults -> instant defaults
			defaultValues: {
				name: '',
				shareable: true,
				category: ITEM_CATEGORY.Other,
			},
			serverDebounceFields: {
				name: 500,
			},
			// Optional: Define queries for relation fields
			linkPickerQueries: {
				// Owner picker - get list of all people and their rooms (to filter by room later)
				owner: { persons: { room: {}, $: { order: { name: 'asc' } } } },
				// Room picker - get list of all rooms
				room: { rooms: { $: { order: { name: 'asc' } } } },
			},
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
					await handleIdbCreate(); // create entity
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
						className={`${type === 'update' && !field.idb.synced ? 'unsynced' : ''}`}
						error={getErrorMessageForField(field)}
						// label={`Name ${type === 'update' && `(Synced: ${JSON.stringify(field.idb.synced)})`}`}
						label={`Name ${type === 'update' && field.idb.synced ? '(Synced)' : '(Unsynced)'}`}
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
					const linkData = field.idb.data || [];
					return (
						<SearchableSelect
							label="Room"
							// clearable
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

			{type === 'create' && (
				<itemForm.Subscribe
					selector={state => [state.canSubmit, state.isSubmitting, state.isPristine]}
					children={([canSubmit, isSubmitting, isPristine]) => (
						<>
							<Space h="xs" />
							<div className="flex justify-end">
								<Button disabled={!canSubmit || isPristine} onClick={() => itemForm.handleSubmit()} loading={isSubmitting}>
									Submit
								</Button>
							</div>
						</>
					)}
				/>
			)}
		</div>
	);
}

function OwnerField({ field, form }: {
	field: FieldApi<FormData, 'owner', FormData['owner'], undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined>
	form: FormApi<FormData, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined>
}) {
	const room = useStore(form.store, state => state.values.room);
	const disabled = !room;
	const roomId = room ? room.id : '';
	const linkData = field.idb.data || [];
	const filteredLinkData = linkData.filter(person => person.room!.id === roomId);

	return (
		<MultiSelect
			disabled={disabled}
			label={`Owner(s) ${field.state.value?.map(item => item!.name).join(', ')}`}
			value={field.state.value?.map(item => item!.id)}
			data={filteredLinkData.map(item => ({ label: item!.name, value: item!.id }))}
			onChange={(value) => {
				field.handleChange(linkData.filter(link => value.includes(link!.id)));
			}}
			error={getErrorMessageForField(field)}
		/>
	);
}

export default ItemForm2;
