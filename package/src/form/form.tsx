import { id } from '@instantdb/react';
import { useForm } from '@mantine/form';
import { zodResolver } from 'mantine-form-zod-resolver';
import React, { memo, useEffect, useImperativeHandle, useMemo } from 'react';
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { z } from 'zod';

import { useIDBReactUIProvider } from '../utils/provider';

interface IDBCustomFieldProps {
	fieldName: string
	children: ReactElement
}

// TODO: Update vs. Create forms
// TODO: Relations
// TODO: Re-usable build zod schema function
// TODO: First get the list of IDBCustomFields, and only build the zod schema that is needed)
// TODO: Create actual default values based on the field type (if it doesn't already exist in the schema)
// TODO: Get defaults defined in the zod schema (check nested objects)
// TODO: Fix type errors
// TODO: Memoize replaced components

// Helper function to create appropriate default schemas
function getDefaultSchema(valueType: string): z.ZodType {
	switch (valueType) {
		case 'string':
			return z.string();
		case 'number':
			return z.number();
		case 'boolean':
			return z.boolean();
		case 'date':
			return z.number(); // instantdb uses number for dates
		case 'json':
			return z.any();
		default:
			return z.string();
	}
}

// Custom field component that will be replaced
export function IDBCustomField({ fieldName, children }: IDBCustomFieldProps) {
	// Ensure there's exactly one child element
	if (!isValidElement(children)) {
		throw new Error('IDBCustomField must have exactly one child element');
	}
	return children;
}
IDBCustomField.displayName = 'IDBCustomField';

// New extracted function for creating zod schema
function createEntityZodSchema(entityAttrs: Record<string, any>): z.ZodObject<any> {
	return z.object(
		Object.entries(entityAttrs).reduce((acc, [key, attr]) => {
			// Safely check and execute _zodTransform
			const transform = (attr as any)._zodTransform;
			if (transform && typeof transform === 'function') {
				try {
					acc[key] = transform();
				} catch (e) {
					// If transform fails, create default schema based on valueType
					acc[key] = getDefaultSchema(attr.valueType);
				}
			} else {
				// Create default schema based on valueType
				acc[key] = getDefaultSchema(attr.valueType);
			}
			return acc;
		}, {} as Record<string, z.ZodType>),
	);
}

// ========================================================
// New stuff
// ========================================================
// Process children to replace IDBCustomField components with form-controlled versions
function processChildren(element: ReactNode, form: ReturnType<typeof useForm>): ReactNode {
	if (!isValidElement(element)) return element;

	// Check if this is an IDBCustomField component
	if (typeof element.type === 'function' && element.type.displayName === IDBCustomField.displayName) {
		const { fieldName } = element.props;
		const customElement = element.props.children;
		// console.log(form.getInputProps(fieldName));

		// Clone the custom element and inject form props
		return cloneElement(customElement, {
			...customElement.props,
			...form.getInputProps(fieldName),
			key: form.key(fieldName),
		});
	}

	// Recursively process children if they exist
	if (element.props.children) {
		return cloneElement(element, {
			...element.props,
			children: React.Children.map(element.props.children, child => processChildren(child)),
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
interface SpecificFormProps extends IDBFormProps {
	form: ReturnType<typeof useForm>
}

export const IDBForm = memo(function BaseForm(props: IDBFormProps) {
	const { db, schema } = useIDBReactUIProvider();
	const entity = schema.entities[props.entity];
	const entityFields = Object.keys(entity.attrs);

	// Use the extracted function to create schema
	const zodSchema = createEntityZodSchema(entity.attrs);

	const form = useForm({
		mode: 'controlled',
		validateInputOnChange: true,
		initialValues: entityFields.reduce((acc, field) => {
			acc[field] = ''; // TODO: use actual zod defaults or primitive defaults
			return acc;
		}, {} as Record<string, string>),
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

		// Proceed if it is an update form that is valid
		if (props.type === 'update') return;
		if (!form.isValid()) return;

		// Create new item
		// TODO: make this reusable between create/update
		const allFields = Object.keys(form.values).reduce((acc, field) => {
			acc[field] = form.values[field];
			return acc;
		}, {} as Record<string, any>);

		db.transact(
			db.tx[props.entity][id()]!.update(allFields),
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

/**
 * Update form component - internal use only
 * This component is used to fetch the initial data and update the form values on form change
 * We use an empty component instead of a hook to avoid conditional hook usage
 * @param props - form props
 */
function UpdateForm(props: SpecificFormProps) {
	const { db, schema } = useIDBReactUIProvider();
	const dbQuery = db.useQuery({
		[props.entity]: { $: { where: { id: props.id } } },
	});
	const item = dbQuery.data?.[props.entity]?.[0];

	// Set inital form data
	// Update mode only
	useEffect(() => {
		if (item) {
			props.form.setValues(item);
			props.form.resetDirty();
		}
	}, [item]);

	// Update form values life
	useEffect(() => {
		// Validate all dirty fields and filter out invalid ones
		const dirtyFields = Object.keys(props.form.getDirty()).filter(key => props.form.getDirty()[key] !== false);
		const validFields = dirtyFields.filter((field) => {
			const validationResult = props.form.validateField(field);
			return !validationResult.hasError;
		});

		if (validFields.length > 0) {
			// Only update if we have an existing item
			console.log('updating fields', validFields);

			if (item) {
				const updatedFields = validFields.reduce((acc, field) => {
					acc[field] = props.form.getValues()![field];
					return acc;
				}, {} as Record<string, any>);
				console.log('updated fields', updatedFields);

				db.transact(
					db.tx[props.entity][props.id]!.update(updatedFields),
				);
			}
		}
	}, [props.form]);

	return null;
}
