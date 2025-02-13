import { TextInput } from '@mantine/core';

import { entityNames, getEntityFields } from '~client/db/instant.schema';
import { ReusableFormComponentProps } from '~client/lib/components/components';
import { useRouteId } from '~client/lib/utils';
import { IDBField, IDBForm } from '~instantdb-react-ui/form/form';

const personFields = getEntityFields(entityNames.persons);

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
			{children}
		</IDBForm>
	);
}

export default PersonForm;
