import { InstaQLEntity } from '@instantdb/react';
import { MultiSelect, TextInput } from '@mantine/core';

import schema from '~client/db/instant.schema';
import { ReusableFormComponentProps } from '~client/lib/components/components';
import { SearchableSelect } from '~client/lib/components/searchable-select';
import { useRouteId } from '~client/lib/utils';
import { entityNames } from '~client/main';
import { IDBForm } from '~instantdb-react-ui/form/form';
import { getEntityFields, IDBField, IDBRelationField } from '~instantdb-react-ui/index';

type Room = InstaQLEntity<typeof schema, 'rooms'>;
const personFields = getEntityFields(schema, 'persons');

function PersonForm({ type, children, ...props }: ReusableFormComponentProps) {
	const id = useRouteId();

	return (
		<IDBForm id={id} entity={entityNames.persons} type={type} {...props}>
			<IDBField fieldName={personFields.name}>
				<TextInput label="Name" />
			</IDBField>
			<IDBField fieldName={personFields.email}>
				<TextInput label="Email" />
			</IDBField>
			<IDBRelationField<Room> fieldName="room" setRelationPickerLabel={item => item.name}>
				<SearchableSelect label="Room" data={[]} />
			</IDBRelationField>
			{children}
		</IDBForm>
	);
}

export default PersonForm;
