/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	cloneElement,
	isValidElement,
	type ReactElement,
	type ReactNode,
	useMemo,
} from 'react';

import { useIDBFormContext } from './form';

// TODO: Re-usable build zod schema function
// TODO: First get the list of IDBFields, and only build the zod schema that is needed)

type IDBEntity = Record<string, any> & { id: string };

interface IDBFieldBaseProps<T extends IDBEntity> {
	fieldName: string
}

export type IDBFieldProps<T extends IDBEntity> = IDBFieldBaseProps<T> & (
  | { children: ReactElement, render?: never }
  | { render: ReactElement, children?: never }
);

export type IDBRelationFieldProps<T extends IDBEntity> = IDBFieldProps<T> & {
	setRelationPickerLabel?: (item: T) => string
};

const checkValidElement = (element: ReactNode) => {
	if (!isValidElement(element)) {
		throw new Error('IDBField must have a single valid React element');
	}
};

/** Custom field component that will be replaced with a form-controlled version */
export function IDBField<T extends IDBEntity>({ fieldName, children, render }: IDBFieldProps<T>) {
	const { form } = useIDBFormContext();
	const renderElement = children || render;
	checkValidElement(renderElement);

	return useMemo(() => {
		// console.log('rendering IDBField', fieldName);
		return cloneElement(renderElement, {
			...(renderElement.props as any),
			...form.getInputProps(fieldName),
			key: form.key(fieldName),
		});
	}, [renderElement, fieldName, form]);
}
IDBField.displayName = 'IDBField';
// export function IDBField<T = any>({ fieldName, children, render }: IDBFieldProps<T>) {
// 	const { form } = useIDBFormContext();
// 	const renderElement = children || render;
// 	checkValidElement(renderElement);

// 	const element = useMemo(() => {
// 		console.log('cloning IDBField element', fieldName);
// 		return cloneElement(renderElement, {
// 			...(renderElement.props as any),
// 			key: fieldName,
// 		});
// 	}, [renderElement, fieldName]);

// 	const inputProps = form.getInputProps(fieldName);

// 	return useMemo(() => {
// 		console.log('rendering IDBField', fieldName);
// 		return cloneElement(element, inputProps);
// 	}, [element, inputProps]);
// }

/** Custom field component that will be replaced with a form-controlled version */
export function IDBRelationField<T extends IDBEntity>({ fieldName, children, render, setRelationPickerLabel }: IDBRelationFieldProps<T>) {
	const { form, relationPickerData } = useIDBFormContext();
	const renderElement = children || render;
	checkValidElement(renderElement);

	return useMemo(() => {
		// console.log('rendering IDBRelationField', fieldName);
		const getLabelFn = setRelationPickerLabel || (item => item.id);
		const data = fieldName in relationPickerData
			? relationPickerData[fieldName].map(item => ({
				label: getLabelFn(item),
				value: item.id,
			}))
			: [];

		return cloneElement(renderElement, {
			...(renderElement.props as any),
			...form.getInputProps(fieldName),
			key: form.key(fieldName),
			data,
		});
	}, [renderElement, fieldName, form, relationPickerData]);
}
IDBRelationField.displayName = 'IDBRelationField';
