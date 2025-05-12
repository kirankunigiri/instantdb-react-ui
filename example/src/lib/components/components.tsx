import { IDBFormType } from '~instantdb-react-ui/form/use-idb-form';

export interface ReusableFormComponentProps {
	type: IDBFormType
	onValidSubmit?: () => void
}
