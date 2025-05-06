/* eslint-disable @typescript-eslint/no-explicit-any */
import { EntitiesDef, id, InstaQLParams, InstaQLResult, LinksDef } from '@instantdb/react';
import { FieldApi, FormOptions, formOptions, useForm } from '@tanstack/react-form';
import { useCallback, useEffect, useRef } from 'react';

import { EntityLinks } from '..';
import { createEntityZodSchemaV3 } from '../form/zod';
import { useNewReactContext } from '../utils/provider';

export type ExtractFormData<
	TSchema extends IContainEntitiesAndLinks<EntitiesDef, any>,
	TQuery extends Record<string, any>,
	TEntity extends keyof InstaQLResult<TSchema, TQuery>,
> = NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never;

export interface IContainEntitiesAndLinks<
	Entities extends EntitiesDef,
	Links extends LinksDef<Entities>,
> {
	entities: Entities
	links: Links
}

interface InstantValue {
	id: string
}

export type IDBFormType = 'update' | 'create';

export function useIDBForm2<
	TSchema extends IContainEntitiesAndLinks<EntitiesDef, any>,
	TEntity extends keyof TSchema['entities'],
	TQuery extends InstaQLParams<TSchema>,
	TLinkQueries extends Partial<Record<keyof TSchema['entities'][TEntity]['links'], InstaQLParams<TSchema>>>,
>(
	createFormOptions: (handleIdbUpdate: () => void) => {
		type: IDBFormType
		schema: TSchema
		entity: TEntity
		query: TQuery
		linkPickerQueries?: TLinkQueries
		debounceFields?: Partial<Record<keyof (NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never), number>>
		defaultValues?: Partial<NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never>
	} & Omit<FormOptions<NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never>, 'defaultValues'>,
) {
	type FormData = NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never;

	// Create handleIdbUpdate function first so we can pass it to get options
	const handleIdbUpdate = useCallback(() => {
		if (!form) return; // Guard against initial render
		if (options.type === 'create') return;

		const formState = form.getState();
		for (const fieldName of Object.keys(formState.values)) {
			const field = form.getFieldState(fieldName);
			if (field) {
				customOnChange(field, field.value);
			}
		}
	}, []);

	// Get all options from the callback
	const options = createFormOptions(handleIdbUpdate);
	const entityName = options.entity as string;
	let queryValue: any = null;

	const { db } = useNewReactContext();
	const links = options.schema.entities[options.entity as string].links as EntityLinks;

	// Use the extracted function to create schema and get defaults
	const { zodSchema, defaults: zodDefaults } = createEntityZodSchemaV3(options.schema.entities[entityName]);

	// Merge default values from options with zod defaults
	for (const [fieldName, fieldValue] of Object.entries(options.defaultValues || {})) {
		zodDefaults[fieldName] = fieldValue;
	}

	const customOnChange = (field: FieldApi<any, any>, value: any) => {
		const oldValue = field.state.value;
		field.handleChange(value);
		if (options.type === 'create') return;

		form.setFieldMeta(field.name, prevMeta => ({ ...prevMeta, synced: false }));

		// Skip update if errors exist
		const errors = form.validateSync('change');
		if (field.state.meta.errors.length > 0 || errors.hasErrored) return;
		const id = form.getFieldValue('id');

		const link = links[field.name];
		if (link) {
			// Relation field db update
			const tx = db.tx[entityName][id]!;
			const cardinality = link.cardinality;
			const transactions = [];

			if (cardinality === 'many') {
				const newValue = value as InstantValue[];
				const prevValues = queryValue?.[field.name] as InstantValue[];
				const idsToUnlink = prevValues.filter((item: InstantValue) =>
					!newValue.some(newItem => newItem.id === item.id),
				).map(item => item.id);
				const idsToLink = newValue.filter((item: InstantValue) =>
					!prevValues.some(prevItem => prevItem.id === item.id),
				).map(item => item.id);

				if (idsToUnlink.length > 0) transactions.push(tx.unlink({ [field.name]: idsToUnlink }));
				if (idsToLink.length > 0) transactions.push(tx.link({ [field.name]: idsToLink }));
			} else if (cardinality === 'one') {
				const newValue = field.state.value as InstantValue;
				if (!oldValue || (oldValue as InstantValue).id !== newValue.id) {
					transactions.push(tx.link({ [field.name]: newValue.id }));
				}
			}

			if (transactions.length > 0) db.transact(transactions);
		} else {
			// Normal field db update
			if (options.debounceFields && Object.keys(options.debounceFields).includes(field.name)) {
				debouncedTransact(() => {
					if (field.state.meta.errors.length === 0) {
						db.transact(db.tx[entityName][id]!.update({ [field.name]: field.state.value }));
					}
				}, options.debounceFields[field.name]);
			} else {
				if (field.state.meta.errors.length === 0) {
					db.transact(db.tx[entityName][id]!.update({ [field.name]: field.state.value }));
				}
			}
		}
	};

	const formOpts = formOptions<FormData>({
		...(() => {
			const { schema, entity, query, debounceFields, type, ...rest } = options;
			return {
				...rest,
				defaultValues: zodDefaults,
			} as FormOptions<FormData>;
		})(),
	});

	const form = useForm({
		...formOpts,
		validators: {
			onChange: zodSchema,
		},
	});

	useEffect(() => {
		// Main entity query
		if (options.type === 'update') {
			db._core.subscribeQuery(options.query, (resp) => {
				if (resp.error) {
					console.error(resp.error.message);
					return;
				}
				if (resp.data) {
					const item = (resp.data[options.entity] as any)?.[0];
					queryValue = item;

					for (const [fieldName, fieldValue] of Object.entries(item)) {
						let newValue: any = fieldValue;
						const prevValue = form.getFieldValue(fieldName);

						// For relations, use the id as value. When unlinking, the value is undefined
						const link = links[fieldName];
						if (link) {
							if (newValue) {
								if (link.cardinality === 'many') {
								// console.log('many', fieldName, newValue);
								// newValue = newValue.map((item: any) => item.id);
								} else {
								// console.log('one', fieldName, newValue);
									newValue = newValue;
								}
							} else {
								newValue = '';
							}
						}

						// Update the form if the value has changed
						if (JSON.stringify(prevValue) !== JSON.stringify(newValue)) {
							console.log(`newValue${JSON.stringify(newValue)}`);
							console.log('setting field value', fieldName, newValue);
							form.setFieldValue(fieldName, newValue);
						}
						if (!(form.getFieldMeta(fieldName))?.synced) {
							form.setFieldMeta(fieldName, prevMeta => ({ ...prevMeta, synced: true }));
						}
					}
				}
			});
		}

		// Link picker queries
		for (const [fieldName, link] of Object.entries(links)) {
			const linkPickerQuery = options.linkPickerQueries?.[fieldName] || {
				[link.entityName]: {},
			};

			db._core.subscribeQuery(linkPickerQuery, (resp) => {
				const linkPickerData = resp.data?.[link.entityName] as any[];
				form.setFieldMeta(fieldName, prevMeta => ({ ...prevMeta, data: linkPickerData }));
			});
		}
		// TODO: check if this needs to be memoized to never change unless options change
	}, [options]);

	// TODO: this is just temporary. later, use an actual debounce library that will run after the user stops typing for a certain amount of time
	const timeoutRef = useRef<NodeJS.Timeout>();
	const debouncedTransact = useCallback((callback: () => void, delay = 500) => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		timeoutRef.current = setTimeout(() => {
			callback();
		}, delay);
	}, []);

	// Wrap field component
	const OriginalField = form.Field;
	const WrappedField = (props: any) => {
		return (
			<OriginalField
				{...props}
				children={(field: FieldApi<any, any>) => {
					field.idb = field.state.meta;
					field.idb.handleChange = (e: any) => customOnChange(field, e);
					return props.children(field);
				}}
			/>
		);
	};
	WrappedField.displayName = 'WrappedField';
	form.Field = WrappedField;

	return form;
}
