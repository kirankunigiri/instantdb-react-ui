/* eslint-disable @typescript-eslint/no-explicit-any */
import { id } from '@instantdb/react';
import { useForm } from '@mantine/form';
import { zodResolver } from 'mantine-form-zod-resolver';
import React, { createContext, isValidElement, memo, type ReactNode, useContext, useEffect, useImperativeHandle, useMemo } from 'react';

import { useIDBReactUIProvider } from '../utils/provider';
import { IDBField, IDBRelationField, IDBRelationFieldProps } from './field';
import { createEntityZodSchemaV2 } from './zod';

// --------------------------------------------------------------------------------
// Form context
interface IDBFormContextProps {
	form: ReturnType<typeof useForm>
	relationPickerData: Record<string, any[]>
}

export const IDBFormContext = createContext<IDBFormContextProps | null>(null);

export function useIDBFormContext() {
	const context = useContext(IDBFormContext);
	if (!context) {
		throw new Error('useFormContext must be used within a FormContext.Provider');
	}
	return context;
}

// --------------------------------------------------------------------------------
// Form
export type IDBFormState = ReturnType<typeof useForm> | null;
export type IDBFormRef = React.RefObject<IDBFormState | null>;
export type IDBFormType = 'update' | 'create';

export interface IDBFormProps {
	className?: string
	formRef?: IDBFormRef
	children: ReactNode
	id: string
	entity: string
	type: IDBFormType
	onFormChange?: () => void
	query?: Record<string, any> | null
}

/**
 * Update mode for the form
 * - onValidForm: Update a field only when the entire form is valid
 * - onValidField: Update a field as long as that field is valid
 */
type IDBFormUpdateMode = 'onValidForm' | 'onValidField';

/**
 * Validation mode for the form
 * - onChange: Validate a field as the user types
 * - onSubmit: Validate a field when the user submits the form
 */
type IDBFormValidationMode = 'onChange' | 'onSubmit';

interface EntityLink {
	entityName: string
	cardinality: 'one' | 'many'
}
type EntityLinks = Record<string, EntityLink>;

export const IDBForm = memo(function BaseForm(props: IDBFormProps) {
	const { db, schema } = useIDBReactUIProvider();
	const entity = schema.entities[props.entity];
	const links = entity.links as EntityLinks;

	// Use the extracted function to create schema and get defaults
	const { zodSchema, defaults } = createEntityZodSchemaV2(entity);

	const form = useForm({
		mode: 'controlled',
		validateInputOnChange: true,
		initialValues: defaults,
		validate: zodResolver(zodSchema),
	});

	// const { fields: formFields, links: formLinks } = processChildren(props.children, form);
	// console.log(formFields, formLinks);

	// Get relation lists
	const queryObject = Object.entries(links).reduce((acc, [_, link]) => ({
		...acc,
		[link.entityName]: {}, // Query all items from the linked entity
	}), {});
	const dbQuery = db.useQuery(props.query || queryObject);

	// Map relation data back to field names
	const relationPickerData = Object.entries(links).reduce((acc, [fieldName, link]) => ({
		...acc,
		[fieldName]: (dbQuery.data as Record<string, any[]>)?.[link.entityName] || [],
	}), {} as Record<string, any[]>);

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

	const contextValue = useMemo(() => ({
		form,
		relationPickerData,
	}), [form, relationPickerData]);

	return (
		<IDBFormContext.Provider value={contextValue}>
			<form onSubmit={handleSubmit} className={props.className || ''}>
				{props.type === 'update' && <UpdateForm {...props} form={form} relationPickerData={relationPickerData} />}
				{props.children}
			</form>
		</IDBFormContext.Provider>
	);
});

/** Update form requires the extra form prop to be passed down */
interface UpdateFormProps extends IDBFormProps {
	form: ReturnType<typeof useForm>
	relationPickerData: Record<string, any[]>
}

/**
 * Update form component - internal use only
 * This component is used to fetch the initial data and update the form values on form change
 * We use an empty component instead of a hook to avoid conditional hook usage
 */
function UpdateForm(props: UpdateFormProps) {
	const { db, schema } = useIDBReactUIProvider();
	const entity = schema.entities[props.entity];
	const links = entity.links as EntityLinks;

	// Query for initial item data TODO: Only include relations that are used in the form
	const queryObject = {
		[props.entity]: {
			$: { where: { id: props.id } },
			// Include all relations in query
			...Object.fromEntries(Object.keys(links).map(label => [label, {}])),
		},
	};
	const dbQuery = db.useQuery(props.query || queryObject);
	const item = dbQuery.data?.[props.entity]?.[0];

	// Set initial form data
	useEffect(() => {
		if (item) {
			// For relation data, replace the relation object with only it's id
			const newFormData = Object.entries(links).reduce((acc, [linkKey]) => {
				const relationValue = item[linkKey];
				if (relationValue) {
					acc[linkKey] = Array.isArray(relationValue)
						? relationValue.map(rel => rel.id)
						: relationValue.id;
				}
				return acc;
			}, { ...item });

			// Filter out invalid relation values
			// Example: If dev passes in a filter for a relation data picker, but the current values are not in that list, we should remove them
			for (const [key, link] of Object.entries(links)) {
				if (link.cardinality === 'many') {
					// For many cardinality, newFormData[key] is an array of IDs. filter out any IDs that don't exist in the relation picker data
					const linkValue = newFormData[key] as string[];
					const validIds = linkValue.filter((id: string) =>
						props.relationPickerData[key].some(rel => rel.id === id),
					);
					if (validIds.length > 0) {
						newFormData[key] = validIds;
					} else {
						newFormData[key] = [];
					}
				} else if (link.cardinality === 'one') {
					// For single cardinality, the value is a string id.
					if (!props.relationPickerData[key].some(rel => rel.id === newFormData[key])) {
						newFormData[key] = '';
					}
				}
			}

			props.form.setValues(newFormData);
			props.form.resetDirty();
		}
	}, [item]);

	// Update db on form update
	useEffect(() => {
		// console.log(item);
		// console.log('props.form.isValid()', props.form.isValid());
		if (!props.form.isDirty()) return;
		if (!props.form.isValid()) return;
		// console.log(props.form.isValid());
		// console.log(props.form.getValues());
		// console.log('updating form');

		// Validate all dirty fields and filter out invalid ones
		const dirtyFields = Object.keys(props.form.getDirty()).filter(key => props.form.getDirty()[key] !== false);
		const validFields = dirtyFields.filter((field) => {
			const validationResult = props.form.validateField(field);
			return !validationResult.hasError;
		});

		// Skip if no valid fields or no item to update
		if (validFields.length <= 0 || !item) return;
		const formValues = props.form.getValues();

		// Separate relation fields from regular fields
		const relationFields = validFields.filter(field => field in links);
		const regularFields = validFields.filter(field => !(field in links));

		// Build update transaction
		const tx = db.tx[props.entity][props.id]!;
		const transactions = [];

		// Handle regular field updates
		if (regularFields.length > 0) {
			const regularFieldValues = regularFields.reduce((acc, field) => {
				acc[field] = formValues[field];
				return acc;
			}, {} as Record<string, any>);
			transactions.push(tx.update(regularFieldValues));
		}

		// Handle relation field updates
		relationFields.forEach((field) => {
			const link = links[field];
			const cardinality = link.cardinality;

			if (cardinality === 'many') {
				// Find the difference between the old and new values, unlink the old values and link the new values
				const newValue = formValues[field] as string[];
				const oldValues = item[field].map((rel: any) => rel.id);
				const idsToUnlink = oldValues.filter((id: string) => !newValue.includes(id));
				const idsToLink = newValue.filter((id: string) => !oldValues.includes(id));

				if (idsToUnlink.length > 0) {
					transactions.push(tx.unlink({ [field]: idsToUnlink }));
				}
				if (idsToLink.length > 0) {
					transactions.push(tx.link({ [field]: idsToLink }));
				}
			} else if (cardinality === 'one') {
				// One cardinality automatically unlinks the old value, so we only add new links
				const newValue = formValues[field] as string;
				const oldValue = item[field]?.id;
				if (newValue !== oldValue) {
					transactions.push(tx.link({ [field]: newValue }));
				}
			}
		});

		// Execute all transactions
		if (transactions.length > 0) db.transact(transactions);
	}, [props.form]);

	return null;
}

function processChildren(
	element: ReactNode,
	form: ReturnType<typeof useForm>,
	fields: string[] = [],
	links: string[] = [],
): { fields: string[], links: string[] } {
	if (!isValidElement(element)) return { fields, links };

	// Check if this is an IDBField component
	if (typeof element.type === 'function' && element.type.displayName === IDBField.displayName) {
		const newElement = element as React.ReactElement<{ fieldName: string }>;
		if (newElement.props.fieldName) {
			fields.push(newElement.props.fieldName);
		}
	}

	// Check if this is an IDBRelationField component
	if (typeof element.type === 'function' && element.type.displayName === IDBRelationField.displayName) {
		const newElement = element as React.ReactElement<IDBRelationFieldProps<any>>;
		if (newElement.props.fieldName) {
			links.push(newElement.props.fieldName);
		}
	}

	// Recursively process children if they exist
	const children = (element.props as any).children as ReactNode;
	if (children) {
		React.Children.forEach(children, (child) => {
			const result = processChildren(child, form, fields, links);
			fields = result.fields;
			links = result.links;
		});
	}

	return { fields, links };
}
