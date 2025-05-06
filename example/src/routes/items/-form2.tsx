import { InstaQLParams } from '@instantdb/react';
import { Button, Checkbox, MultiSelect, TextInput } from '@mantine/core';
import { FieldApi, formOptions, ReactFormExtendedApi, useStore } from '@tanstack/react-form';
import { toast } from 'sonner';

import schema, { ITEM_CATEGORY } from '~client/db/instant.schema';
import { ReusableFormComponentProps2 } from '~client/lib/components/components';
import { SearchableSelect } from '~client/lib/components/searchable-select';
import { useRouteId } from '~client/lib/utils';
import { ExtractFormData, useIDBForm } from '~instantdb-react-ui/index';

const getItemQuery = (id: string) => ({ items: { room: {}, owner: { room: {} }, $: { where: { id } } } } satisfies InstaQLParams<typeof schema>);
type FormData = ExtractFormData<typeof schema, ReturnType<typeof getItemQuery>, 'items'>;

function ItemForm2({ onValidSubmit, type }: ReusableFormComponentProps2) {
	const id = useRouteId();
	console.log('rendering form');

	const itemForm = useIDBForm({
		type,
		schema,
		entity: 'items',
		query: getItemQuery(id),
		debounceFields: {
			name: 500,
		},
		defaultValues: {
			name: '',
			shareable: false,
			category: ITEM_CATEGORY.Other,
		},
		linkPickerQueries: {
			// Owner picker - get list of all people and their rooms (to filter by room later)
			owner: { persons: { room: {}, $: { order: { name: 'asc' } } } },
			// Room picker - get list of all rooms
			room: { rooms: { $: { order: { name: 'asc' } } } },
		},
		// listeners: {
		// 	onMount: ({ formApi }) => {
		// 	  // custom logging service
		// 	  loggingService('mount', formApi.state.values)
		// 	},

		// 	onChange: ({ formApi, fieldApi }) => {
		// 	  // autosave logic
		// 	  if (formApi.state.isValid) {
		// 		handleIdbUpdate()
		// 	  }

		// 	  // fieldApi represents the field that triggered the event.
		// 	  console.log(fieldApi.name, fieldApi.state.value)
		// 	},
		// 	onChangeDebounceMs: 500,
		//   },
		onSubmit: async ({ value, idbSubmit }) => {
			console.log('valid submit');
			try {
				// TODO: fix idbSubmit first
				await idbSubmit(value);
				onValidSubmit?.();
			} catch (error) {
				console.error(error);
				toast.error('Error submitting form');
			}
		},
		onSubmitInvalid: (errors) => {
			console.log('invalid submit');
			console.log(errors);
		},
	});

	return (
		<div className="flex flex-col gap-1">
			<p className="text-lg font-bold">Item Form</p>
			<itemForm.Field
				name="items"
				children={field => (
					<TextInput
						className={`${type === 'update' && !field.idb.synced ? 'unsynced' : ''}`}
						error={field.state.meta.errors.join(', ')}
						// label={`Name ${type === 'update' && `(Synced: ${JSON.stringify(field.idb.synced)})`}`}
						label={`Name ${type === 'update' && field.idb.synced ? '(Synced)' : '(Unsynced)'}`}
						value={field.state.value}
						onChange={e => field.idb.handleChange(e.target.value)}
					/>
				)}
			/>
			<itemForm.Field
				name="shareable"
				children={field => (
					<Checkbox
						label="Shareable"
						checked={field.state.value}
						onChange={e => field.idb.handleChange(e.target.checked)}
					/>
				)}
			/>
			<itemForm.Field
				name="category"
				children={field => (
					<SearchableSelect
						label="Category"
						value={field.state.value}
						onChange={value => field.idb.handleChange(value as ITEM_CATEGORY)}
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
								// TODO: This is broken, might need to await the handleChange
								console.log('room changed to', value);
								// itemForm.setFieldValue('owner', []);
								// field.handleChange(linkData.find(item => item!.id === value)!);
								field.idb.handleChange(linkData.find(item => item!.id === value)!);
							}}
						/>
					);
				}}
			/>
			{/* <itemForm.Field
				name="owner"
				children={field => <OwnerField field={field} form={itemForm} />}
			/> */}
			{type === 'create' && (
				<itemForm.Subscribe
					selector={state => [state.canSubmit, state.isSubmitting]}
					children={([canSubmit, isSubmitting]) => (
						<div className="flex justify-end">
							<Button disabled={!canSubmit} onClick={() => itemForm.handleSubmit()} loading={isSubmitting}>
								Submit
							</Button>
						</div>
					)}
				/>
			)}
		</div>
	);
}

// TODO: Change owner filter based on the room
function OwnerField({ field, form }: {
	field: FieldApi<FormData, 'owner'>
	form: ReactFormExtendedApi<FormData>
}) {
	const room = useStore(form.store, state => state.values.room);
	const disabled = !room;
	const roomId = room ? room.id : '';
	const linkData = field.idb.data || [];
	const filteredLinkData = linkData.filter(person => person.room!.id === roomId);
	console.log(field.state.value?.map(item => item!.id));
	console.log(filteredLinkData.map(item => ({ label: item!.name, value: item!.id })));

	return (
		<MultiSelect
			disabled={disabled}
			label={`Owner(s) ${field.state.value?.map(item => item!.name).join(', ')}`}
			value={field.state.value?.map(item => item!.id)}
			data={filteredLinkData.map(item => ({ label: item!.name, value: item!.id }))}
			// onChange={value => field.idb.handleChange(linkData.filter(link => value.includes(link!.id)))}
			onChange={(value) => {
				// TODO: need to update owner and room at the same time in case room was changed
				field.handleChange(linkData.filter(link => value.includes(link!.id)));
				setTimeout(() => {
					form.handleSubmit();
				}, 1);
				// field.idb.handleChange(linkData.filter(link => value.includes(link!.id)));
				// form.setFieldValue('room', form.getFieldValue('room'));
				// form.setFieldValue('room', form.getFieldValue('room'));
				// form.handleSubmit();
			}}
			error={field.state.meta.errors.join(', ')}
		/>
	);
}

export default ItemForm2;
