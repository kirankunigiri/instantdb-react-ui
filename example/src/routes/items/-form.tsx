import { TextInput } from '@mantine/core';

import { entityNames, getEntityFields, getEntityFieldsAndRelations, ITEM_CATEGORY } from '~client/db/instant.schema';
import { CheckboxWrapper, DateInputWrapper, ReusableFormComponentProps } from '~client/lib/components/components';
import { SearchableSelect } from '~client/lib/components/searchable-select';
import { useRouteId } from '~client/lib/utils';
import { IDBField, IDBForm } from '~instantdb-react-ui/form/form';

const itemFields = getEntityFieldsAndRelations(entityNames.items);

function ItemForm({ type, children, ...props }: ReusableFormComponentProps) {
	const id = useRouteId();

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
			<IDBField fieldName={itemFields.owner}>
				<SearchableSelect label="Owner" data={[]} />
			</IDBField>
			{children}
		</IDBForm>
	);
}

export default ItemForm;
