import { TextInput } from '@mantine/core';

import { entityNames, getEntityFields, ITEM_CATEGORY } from '~client/db/instant.schema';
import { CheckboxWrapper, DateInputWrapper, ReusableFormComponentProps } from '~client/lib/components/components';
import { SearchableSelect } from '~client/lib/components/searchable-select';
import { useRouteId } from '~client/lib/utils';
import { db } from '~client/main';
import { IDBField, IDBForm } from '~instantdb-react-ui/form/form';

const itemFields = getEntityFields(entityNames.items);

function ItemForm({ type, children, ...props }: ReusableFormComponentProps) {
	const id = useRouteId();

	const relationsQuery = db.useQuery({
		items: {
			$: { where: { id } },
			rooms: {},
			owner: {},
		},
	});
	console.log(relationsQuery.data);

	return (
		<IDBForm id={id} entity={entityNames.items} type={type} {...props}>
			<IDBField fieldName="name">
				<TextInput label="Name" />
			</IDBField>
			<IDBField fieldName={itemFields.shareable}>
				<CheckboxWrapper label="Shareable" />
			</IDBField>
			<IDBField fieldName={itemFields.category}>
				<SearchableSelect label="Category" data={Object.values(ITEM_CATEGORY).map(category => ({ label: category, value: category }))} />
			</IDBField>
			<IDBField fieldName={itemFields.date}>
				<DateInputWrapper label="Date" />
			</IDBField>
			{/* <IDBField fieldName="owner">
				<SearchableSelect label="Owner" />
			</IDBField> */}
			{children}
		</IDBForm>
	);
}

export default ItemForm;
