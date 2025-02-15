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
	dependsOn?: string[]
}

export type IDBFieldProps<T extends IDBEntity> = IDBFieldBaseProps<T> & (
  | { children: ReactElement, render?: never }
  | { render: ReactElement, children?: never }
);

export type IDBRelationFieldProps<T extends IDBEntity> = IDBFieldProps<T> & {
	setRelationPickerLabel?: (item: T) => string // TODO: Rename item
	relationPickerQuery?: Record<string, any>
	filter?: (entity: Record<string, any>, field: T) => boolean
};

const checkValidElement = (element: ReactNode) => {
	if (!isValidElement(element)) {
		throw new Error('IDBField must have a single valid React element');
	}
};

/** Custom field component that will be replaced with a form-controlled version */
export function IDBField<T extends IDBEntity>({ fieldName, children, render, dependsOn }: IDBFieldProps<T>) {
	const { form } = useIDBFormContext();
	const renderElement = children || render;
	checkValidElement(renderElement);

	return useMemo(() => {
		// console.log('rendering IDBField', fieldName);
		const disabled = dependsOn?.some(dep => !form.isValid(dep)) ?? false;
		return cloneElement(renderElement, {
			...(renderElement.props as any),
			...form.getInputProps(fieldName),
			key: form.key(fieldName),
			disabled,
		});
	}, [renderElement, fieldName, form, dependsOn]);
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
export function IDBRelationField<T extends IDBEntity>({ fieldName, children, render, setRelationPickerLabel, filter, dependsOn }: IDBRelationFieldProps<T>) {
	const { form, relationPickerData, transformedFormValues, dependencies, defaults } = useIDBFormContext();
	const renderElement = children || render;
	checkValidElement(renderElement);

	return useMemo(() => {
		console.log('rendering IDBRelationField', fieldName);

		const disabled = dependsOn?.some(dep => !form.isValid(dep)) ?? false;

		if (filter && !disabled) {
			relationPickerData[fieldName] = relationPickerData[fieldName].filter(item => filter(transformedFormValues, item));
		}

		// console.log('rendering IDBRelationField', fieldName);
		const getLabelFn = setRelationPickerLabel || (item => item.id);
		const data = fieldName in relationPickerData
			? relationPickerData[fieldName].map(item => ({
				label: getLabelFn(item),
				value: item.id,
			}))
			: [];

		// Clear dependencies when this field changes
		const inputProps = form.getInputProps(fieldName);
		const customOnChange = (value: any) => {
			if (dependencies[fieldName] && dependencies[fieldName].length > 0) {
				dependencies[fieldName].forEach((dep) => {
					form.setFieldValue(dep, defaults[dep]);
				});
			}
			inputProps.onChange(value);
		};

		return cloneElement(renderElement, {
			...(renderElement.props as any),
			...inputProps,
			key: form.key(fieldName),
			data,
			disabled,
			onChange: customOnChange,
		});
	}, [renderElement, fieldName, form, relationPickerData, dependsOn]);
}
IDBRelationField.displayName = 'IDBRelationField';
