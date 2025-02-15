import { InstaQLEntity, InstaQLParams } from '@instantdb/react';
import { MultiSelect, TextInput } from '@mantine/core';

import schema, { AppSchema, ITEM_CATEGORY } from '~client/db/instant.schema';
import { CheckboxWrapper, DateInputWrapper, ReusableFormComponentProps } from '~client/lib/components/components';
import { SearchableSelect } from '~client/lib/components/searchable-select';
import { useRouteId } from '~client/lib/utils';
import { db, entityNames } from '~client/main';
import { getEntityFields, IDBField, IDBForm, IDBRelationField } from '~instantdb-react-ui/index';

type Person = InstaQLEntity<typeof schema, 'persons'>;
type Room = InstaQLEntity<typeof schema, 'rooms'>;
const itemFields = getEntityFields(schema, 'items');

function ItemForm({ type, children, ...props }: ReusableFormComponentProps) {
	const id = useRouteId();

	// Get the room id for the item
	const roomQuery = db.useQuery({
		rooms: {
			$: { where: { 'items.id': id } },
		},
	});
	const roomId = roomQuery.data?.rooms[0]?.id;

	// Build a query that only has people for this room as picker data
	let query = null;
	if (roomId) {
		query = {
			items: {
				$: { where: { id: id } },
				room: {},
				owner: {},
			},
			persons: {
				$: { where: { 'room.id': roomId } },
			},
			rooms: {},
		} satisfies InstaQLParams<AppSchema>;
	}

	return (
		<IDBForm id={id} entity={entityNames.items} type={type} query={query} {...props}>

			{/* Example using render prop */}
			<IDBField fieldName={itemFields.name} render={<TextInput label="Name" />} />
			<IDBField fieldName={itemFields.shareable} render={<CheckboxWrapper label="Shareable" />} />

			{/* Examples using children prop */}
			<IDBField fieldName={itemFields.category}>
				<SearchableSelect label="Category" data={Object.values(ITEM_CATEGORY).map(category => ({ label: category, value: category }))} />
			</IDBField>
			<IDBField fieldName={itemFields.date}>
				<DateInputWrapper label="Date Added" />
			</IDBField>

			{/* Relation field examples */}
			<IDBRelationField<Room> fieldName="room" setRelationPickerLabel={item => item.name}>
				<SearchableSelect label="Location (room)" data={[]} />
			</IDBRelationField>
			<IDBRelationField<Person> fieldName="owner" setRelationPickerLabel={item => item.name}>
				<MultiSelect label="Owner(s)" data={[]} searchable />
			</IDBRelationField>
			{children}
		</IDBForm>
	);
}

export default ItemForm;
