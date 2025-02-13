/* eslint-disable @typescript-eslint/no-explicit-any */
import { id } from '@instantdb/react';
import { useForm } from '@mantine/form';
import { zodResolver } from 'mantine-form-zod-resolver';
import React, { memo, useEffect, useImperativeHandle, useMemo } from 'react';
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

import { useIDBReactUIProvider } from '../utils/provider';
import { createEntityZodSchema } from './zod';

interface IDBFieldProps {
	fieldName: string
	children: ReactElement
}

// TODO: Relations
// TODO: Re-usable build zod schema function
// TODO: First get the list of IDBFields, and only build the zod schema that is needed)
// TODO: Get defaults defined in the zod schema (check nested objects)

/** Custom field component that will be replaced with a form-controlled version */
export function IDBField({ fieldName, children }: IDBFieldProps) {
	// Ensure there's exactly one child element
	if (!isValidElement(children)) {
		throw new Error('IDBCustomField must have exactly one child element');
	}
	return children;
}
IDBField.displayName = 'IDBField';

/** Process children to replace IDBField components with form-controlled versions */
function processChildren(element: ReactNode, form: ReturnType<typeof useForm>): ReactNode {
	if (!isValidElement(element)) return element;

	// Check if this is an IDBCustomField component
	const elementDisplayName = (element.type as any).displayName;
	if (typeof element.type === 'function' && elementDisplayName === IDBField.displayName) {
		// Cast to ReactElement with IDBFieldProps
		const idbField = element as ReactElement<IDBFieldProps>;
		const fieldName = idbField.props.fieldName;
		const childElement = idbField.props.children;

		// Clone the child element and inject form props
		return cloneElement(childElement, {
			...(childElement.props as any),
			...form.getInputProps(fieldName),
			key: form.key(fieldName),
		});
	}

	// Recursively process children if they exist
	const unknownElement = element as any;
	if (unknownElement.props.children) {
		return cloneElement(unknownElement, {
			...unknownElement.props,
			children: React.Children.map(unknownElement.props.children, child => processChildren(child, form)),
		});
	}

	return element;
};

export type IDBFormState = ReturnType<typeof useForm> | null;
export type IDBFormRef = React.RefObject<IDBFormState | null>;
export type IDBFormType = 'update' | 'create';

export interface IDBFormProps {
	formRef?: IDBFormRef
	children: ReactNode
	id: string
	entity: string
	type: IDBFormType
	onFormChange?: () => void
}

export const IDBForm = memo(function BaseForm(props: IDBFormProps) {
	const { db, schema } = useIDBReactUIProvider();
	const entity = schema.entities[props.entity];
	const entityFields = Object.keys(entity.attrs);

	// Use the extracted function to create schema and get defaults
	const { zodSchema, defaults } = createEntityZodSchema(entity.attrs);

	const form = useForm({
		mode: 'controlled',
		validateInputOnChange: true,
		initialValues: defaults,
		validate: zodResolver(zodSchema),
	});

	// Handle form change
	const { onFormChange } = props;
	useEffect(() => {
		if (onFormChange) onFormChange();
	}, [onFormChange, form.values]);

	// Expose form via ref
	useImperativeHandle(props.formRef, () => form);

	// Handle form submit - create form only
	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		// Skip for update form or if it's invalid
		if (props.type === 'update' || !form.isValid()) return;

		// Create new item
		db.transact(
			db.tx[props.entity][id()]!.update(form.values),
		);
	};

	// Process children to replace IDBCustomField components with form-controlled versions
	const processedChildren = useMemo(() =>
		React.Children.map(props.children, child => processChildren(child, form)),
	[props.children, form]);

	return (
		<form onSubmit={handleSubmit}>
			{props.type === 'update' && <UpdateForm {...props} form={form} />}
			{processedChildren}
		</form>
	);
});

/** Update form requires the extra form prop to be passed down */
interface UpdateFormProps extends IDBFormProps {
	form: ReturnType<typeof useForm>
}

/**
 * Update form component - internal use only
 * This component is used to fetch the initial data and update the form values on form change
 * We use an empty component instead of a hook to avoid conditional hook usage
 */
function UpdateForm(props: UpdateFormProps) {
	const { db, schema } = useIDBReactUIProvider();

	// Query for initial item data
	const dbQuery = db.useQuery({
		[props.entity]: { $: { where: { id: props.id } } },
	});
	const item = dbQuery.data?.[props.entity]?.[0];

	// Set initial form data
	useEffect(() => {
		if (item) {
			props.form.setValues(item);
			props.form.resetDirty();
		}
	}, [item]);

	// Update db on form update
	useEffect(() => {
		// Validate all dirty fields and filter out invalid ones
		const dirtyFields = Object.keys(props.form.getDirty()).filter(key => props.form.getDirty()[key] !== false);
		const validFields = dirtyFields.filter((field) => {
			const validationResult = props.form.validateField(field);
			return !validationResult.hasError;
		});

		// Skip if no valid fields or no item to update
		if (validFields.length <= 0 || !item) return;
		console.log('updating fields', validFields);

		// Get all fields to update
		const formValues = props.form.getValues();
		const fieldValuesToUpdate = validFields.reduce((acc, field) => {
			acc[field] = formValues[field];
			return acc;
		}, {} as Record<string, any>);

		console.log('updated fields', fieldValuesToUpdate);
		db.transact(
			db.tx[props.entity][props.id]!.update(fieldValuesToUpdate),
		);
	}, [props.form]);

	return null;
}

// 	// Query to fetch relation data
// 	const relationQuery = db.useQuery({
// 		[props.entity]: {
// 			$: { where: { id: props.id } },
// 			// Include all relations in query
// 			...Object.fromEntries(Object.keys(relations).map(label => [label, {}])),
// 		},
// 	});

// 	// Add type for relation metadata
// interface RelationInfo {
// 	type: 'one' | 'many'
// 	entity: string
// 	label: string
// }

// // Helper to get relations for an entity
// function getEntityRelations(schema: AppSchema, entityName: string): Record<string, RelationInfo> {
// 	const relations: Record<string, RelationInfo> = {};

// 	Object.entries(schema.links).forEach(([_, link]) => {
// 		if (link.forward.on === entityName) {
// 			relations[link.forward.label] = {
// 				type: link.forward.has,
// 				entity: link.reverse.on,
// 				label: link.forward.label,
// 			};
// 		}
// 	});

// 	return relations;
// }
