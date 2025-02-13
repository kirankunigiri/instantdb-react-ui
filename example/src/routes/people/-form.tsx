import { TextInput } from '@mantine/core';

import { entityNames, getEntityFields } from '~client/db/instant.schema';
import { ReusableFormComponentProps } from '~client/lib/components/components';
import { useRouteId } from '~client/lib/utils';
import { IDBCustomField, IDBForm } from '~instantdb-react-ui/form/form';

const personFields = getEntityFields(entityNames.persons);

function PersonForm({ type, children, ...props }: ReusableFormComponentProps) {
	const id = useRouteId();

	return (
		<IDBForm id={id} entity={entityNames.persons} type={type} {...props}>
			<IDBCustomField fieldName={personFields.name}>
				<TextInput label="Name" />
			</IDBCustomField>
			<IDBCustomField fieldName={personFields.email}>
				<TextInput label="Email" />
			</IDBCustomField>
			{children}
		</IDBForm>
	);
}

export default PersonForm;
