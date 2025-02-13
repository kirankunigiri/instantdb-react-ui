import { TextInput } from '@mantine/core';

import { entityNames, getEntityFields, ITEM_CATEGORY } from '~client/db/instant.schema';
import { CheckboxWrapper, DateInputWrapper, ReusableFormComponentProps } from '~client/lib/components/components';
import { SearchableSelect } from '~client/lib/components/searchable-select';
import { useRouteId } from '~client/lib/utils';
import { IDBCustomField, IDBForm } from '~instantdb-react-ui/form/form';

const itemFields = getEntityFields(entityNames.items);

function ItemForm({ type, children, ...props }: ReusableFormComponentProps) {
	const id = useRouteId();

	return (
		<IDBForm id={id} entity={entityNames.items} type={type} {...props}>
			<IDBCustomField fieldName="name">
				<TextInput label="Name" />
			</IDBCustomField>
			<IDBCustomField fieldName={itemFields.shareable}>
				<CheckboxWrapper label="Shareable" />
			</IDBCustomField>
			<IDBCustomField fieldName={itemFields.category}>
				<SearchableSelect label="Category" data={Object.values(ITEM_CATEGORY).map(category => ({ label: category, value: category }))} />
			</IDBCustomField>
			<IDBCustomField fieldName={itemFields.date}>
				<DateInputWrapper label="Date" />
			</IDBCustomField>
			{children}
		</IDBForm>
	);
}

export default ItemForm;
