/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FieldApi, FieldMeta, Validator } from '@tanstack/react-form';
import { useForm } from '@tanstack/react-form';
import { cloneElement, createContext, memo, ReactElement, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { EntityLinks, IDBFormProps } from '../form/form';
import { createEntityZodSchemaV2 } from '../form/zod';
import { useNewReactContext } from '../utils/provider';

type IDBEntity = Record<string, any> & { id: string };

interface NewFieldBaseProps<T extends IDBEntity> {
	fieldName: string
}

// TODO: Type child element to have required props
// type ChildReactElement = ReactElement<{ children: string }>;

export type NewFieldProps<T extends IDBEntity> = NewFieldBaseProps<T> & (
  | { children: ReactElement, render?: never }
  | { render: (field: TestField) => ReactElement, children?: never }
);

interface NewFieldMeta extends FieldMeta {
	synced: boolean
}
interface NewRelationFieldMeta extends FieldMeta {
	data: any[]
}

interface TestField extends FieldApi<unknown, string, undefined, Validator<unknown, unknown> | undefined, unknown> {
	state: {
		meta: NewRelationFieldMeta
		value: any
	}
}

// --------------------------------------------------------------------------------
// Form context
interface NewFormContextProps {
	form: ReturnType<typeof useForm>
	entityName: string
	id: string
}

export const NewFormContext = createContext<NewFormContextProps | null>(null);

export function useNewFormContext() {
	const context = useContext(NewFormContext);
	if (!context) throw new Error('useFormContext must be used within a FormContext.Provider');
	return context;
}

// --------------------------------------------------------------------------------
// Form component

export interface NewFormProps {
	className?: string
	children: ReactNode
	id: string
	entity: string
	query?: Record<string, any> | null
}

export const NewForm = memo((props: NewFormProps) => {
	console.log('rendering newform');

	const { schema } = useNewReactContext();
	const entity = schema.entities[props.entity];
	const links = entity.links as EntityLinks;

	// Use the extracted function to create schema and get defaults
	const { zodSchema, defaults } = createEntityZodSchemaV2(entity);

	const form = useForm({
		defaultValues: defaults,
		onSubmit: async ({ value }) => {
			console.log('submitting form', value);
		},
		validators: {
			onChange: zodSchema,
		},
	});

	return (
		<>
			<NewFormContext.Provider value={{ form, entityName: props.entity, id: props.id }}>
				<UpdateForm />
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					{props.children}
					<button type="submit">Submit</button>
				</form>
			</NewFormContext.Provider>
		</>
	);
});
NewForm.displayName = 'NewForm';

/** Update form requires the extra form prop to be passed down */
interface UpdateFormProps extends IDBFormProps {
	form: ReturnType<typeof useForm>
}

const UpdateForm = () => {
	const { db, schema } = useNewReactContext();
	const { form, entityName, id } = useNewFormContext();

	const entity = schema.entities[entityName];
	const links = entity.links as EntityLinks;

	const queryObject = {
		[entityName]: {
			$: { where: { id } },
			// Include all relations in query
			...Object.fromEntries(Object.keys(links).map(label => [label, {}])),
		},
	};

	useEffect(() => {
		db.subscribeQuery(queryObject, (resp) => {
			if (resp.error) {
				console.error(resp.error.message);
				return;
			}
			if (resp.data) {
				const item = resp.data[entityName]?.[0];
				// console.log(item);

				for (const [fieldName, fieldValue] of Object.entries(item)) {
					let newValue: any = fieldValue;
					const prevValue = form.getFieldValue(fieldName);

					// For relations, use the id as value. When unlinking, the value is undefined
					const link = links[fieldName];
					if (link) {
						if (newValue) {
							if (link.cardinality === 'many') {
								newValue = newValue.map((item: any) => item.id);
							} else {
								newValue = newValue.id;
							}
						} else {
							newValue = '';
						}
					}

					// Update the form if the value has changed
					if (JSON.stringify(prevValue) !== JSON.stringify(newValue)) {
						// console.log('setting field value', fieldName, newValue);
						form.setFieldValue(fieldName, newValue);
					}
					if (!(form.getFieldMeta(fieldName) as NewFieldMeta)?.synced) {
						form.setFieldMeta(fieldName, prevMeta => ({ ...prevMeta, synced: true }));
					}
				}
			}
		});
	}, []);

	return null;
};

// TODO: memoize it
export const NewField = (props: { fieldName: string, children: ReactElement }) => {
	const { db, schema } = useNewReactContext();
	const { form, entityName, id } = useNewFormContext();
	console.log('rendering field');

	// const entity = schema.entities[entityName];
	// const links = entity.links as EntityLinks;

	// TODO: this is just temporary. later, use an actual debounce library that will run after the user stops typing for a certain amount of time
	const timeoutRef = useRef<NodeJS.Timeout>();
	const debouncedTransact = useCallback((value: any) => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		timeoutRef.current = setTimeout(() => {
			console.log('transacting', value);
			db.transact(db.tx[entityName][id]!.update({ [props.fieldName]: value }));
		}, 500);
	}, [db, entityName, id, props.fieldName]);

	const customOnChange = (field: FieldApi<any, any>, e: any) => {
		field.handleChange(e.target.value);
		form.setFieldMeta(field.name, prevMeta => ({ ...prevMeta, synced: false }));
		debouncedTransact(e.target.value);
	};

	return (
		<form.Field
			name={props.fieldName}
			children={field => (
				<>
					<p>Synced: {`${field.state.meta.synced || false}`}</p>
					{
						cloneElement(props.children, {
							...(props.children.props as any),
							value: field.state.value,
							onBlur: field.handleBlur,
							onChange: (e: any) => customOnChange(field, e),
							error: field.state.meta.errors.join(','),
						})
					}
				</>
			)}
		/>
	);
};

export function NewRelationField<T extends IDBEntity>(props: NewFieldProps<T>) {
	const { db, schema } = useNewReactContext();
	const { form, entityName, id } = useNewFormContext();
	const renderElement = props.children;
	console.log('rendering relation field');

	const entity = schema.entities[entityName];
	const links = entity.links as EntityLinks;
	const link = links[props.fieldName];
	const queryObject = {
		[link.entityName]: {},
	};

	// Get relation picker data
	useEffect(() => {
		db.subscribeQuery(queryObject, (resp) => {
			if (resp.error) {
				console.error(resp.error.message);
				return;
			}
			if (resp.data) {
				const relationPickerData = resp.data[link.entityName];
				form.setFieldMeta(props.fieldName, prevMeta => ({ ...prevMeta, data: relationPickerData }));
			}
		});
	}, []);

	const customOnChange = (field: FieldApi<any, any>, e: any) => {
		const oldValue = form.getFieldValue(field.name);

		field.handleChange(e.target.value);
		const newValue = e.target.value;
		const tx = db.tx[entityName][id]!;

		const cardinality = link.cardinality;
		const transactions = [];

		if (cardinality === 'many') {
			// Find the difference between the old and new values, unlink the old values and link the new values
			const prevValues = oldValue as string[];
			const idsToUnlink = prevValues.filter((id: string) => !newValue.includes(id));
			const idsToLink = newValue.filter((id: string) => !prevValues.includes(id));
			console.log(idsToUnlink, idsToLink);

			if (idsToUnlink.length > 0) transactions.push(tx.unlink({ [field.name]: idsToUnlink }));
			if (idsToLink.length > 0) transactions.push(tx.link({ [field.name]: idsToLink }));
		} else if (cardinality === 'one') {
			// Unlink the old value and link the new value
			const newValue = e.target.value as string;
			if (oldValue !== newValue) {
				transactions.push(tx.link({ [field.name]: newValue }));
			}
		}

		if (transactions.length > 0) db.transact(transactions);
	};

	return (
		<form.Field
			name={props.fieldName}
			children={field => (
				<>
					<p>Dirty: {`${field.state.meta.isDirty}`}</p>
					{
						// cloneElement(renderElement, {
						// 	...(renderElement.props as any),
						// 	value: field.state.value,
						// 	onBlur: field.handleBlur,
						// 	onChange: (e: any) => customOnChange(field, e),
						// 	error: field.state.meta.errors.join(','),
						// 	// data: relationPickerData,
						// 	data: (field as TestField).state.meta.data || [],
						// })
					}
					{cloneElement(
						props.render
							? props.render(field as TestField)
							: props.children!,
						{
							value: field.state.value,
							onBlur: field.handleBlur,
							onChange: (e: any) => customOnChange(field, e),
							error: field.state.meta.errors.join(','),
							data: (field as TestField).state.meta.data || [],
						},
					)}
				</>
			)}
		/>
	);
};
