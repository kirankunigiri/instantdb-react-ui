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

export function useIDBForm<
	TSchema extends IContainEntitiesAndLinks<EntitiesDef, any>,
	TEntity extends keyof TSchema['entities'],
	TQuery extends InstaQLParams<TSchema>,
	TLinkQueries extends Partial<Record<keyof TSchema['entities'][TEntity]['links'], InstaQLParams<TSchema>>>, // ideally, we should limit this to only links that were in the query, but for now we allow all links
>(
	options: Omit<FormOptions<NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined>, 'defaultValues' | 'onSubmit'> & {
		type: IDBFormType
		schema: TSchema
		entity: TEntity
		query: TQuery
		linkPickerQueries?: TLinkQueries
		debounceFields?: Partial<Record<keyof (NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never), number>>
		defaultValues?: Partial<NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never>
		onSubmit?: (options: { idbSubmit: (value: NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never) => Promise<void>, value: NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never }) => Promise<void>
	},
) {
	type FormData = NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never;
	// type FormData = ExtractFormData<TSchema, TQuery, TEntity>; // this seems to slow down type inference autocomplete
	const entityName = options.entity as string;
	let queryValue: any = null;

	// Use the extracted function to create schema and get defaults
	const { zodSchema, defaults: zodDefaults } = createEntityZodSchemaV3(options.schema.entities[entityName]);

	// Merge default values from options with zod defaults
	// TODO: Test with create form
	for (const [fieldName, fieldValue] of Object.entries(options.defaultValues || {})) {
		zodDefaults[fieldName] = fieldValue;
	}

	const { db } = useNewReactContext();
	const links = options.schema.entities[options.entity as string].links as EntityLinks;

	const formOpts = formOptions<FormData>({
		...(() => {
			const { schema, entity, query, debounceFields, type, ...rest } = options;
			return {
				...rest,
				defaultValues: zodDefaults, // replaces defaultValues with the merged zodDefaults
			} as FormOptions<FormData>;
		})(),
	});

	const idbSubmit = async (value: FormData) => {
		const linkValues: Record<string, any> = {};
		const normalValues: Record<string, any> = {};

		for (const [fieldName, fieldValue] of Object.entries(value as object)) {
			if (links[fieldName]) {
				linkValues[fieldName] = fieldValue;
			} else {
				normalValues[fieldName] = fieldValue;
			}
		}

		const useId = options.type === 'create' ? id() : (value as InstantValue).id;
		let baseTransaction = db.tx[entityName][useId]!.update(normalValues);

		for (const [fieldName, fieldValue] of Object.entries(linkValues)) {
			const link = links[fieldName];
			if (link) {
				if (link.cardinality === 'many') {
					const linkValues = fieldValue as InstantValue[];
					baseTransaction = baseTransaction.link({ [fieldName]: linkValues.map(val => val.id) });
				} else if (link.cardinality === 'one') {
					const linkValue = fieldValue as InstantValue;
					baseTransaction = baseTransaction.link({ [fieldName]: linkValue.id });
				}
			}
		}

		await db.transact(baseTransaction);
	};

	const form = useForm({
		...formOpts,
		validators: {
			onChange: zodSchema,
		},
		onSubmit: async ({ value }) => {
			if (options.onSubmit) {
				await options.onSubmit({ value, idbSubmit });
			} else {
				await idbSubmit(value);
			}
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
				// Find the difference between the old and new values, then unlink the old values and link the new values
				const newValue = value as InstantValue[];
				// Imagine person A and B is linked. We unlink A (which updates) then unlink B (which doesn't update because the field requires at least one link and we have a validation error.). Now the field is empty, but when we link person C, we fail to unlink person B beause prevValue was null. The solution to this is to use the queryValue from the database as the prevValue instead of the field value
				// TODO: For create form, you can't do this (use the field value instead)
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
				// Unlink the old value and link the new value
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

	// This makes state undefined
	const OriginalField = form.Field;
	const WrappedField = (props: any) => {
		return (
			<OriginalField
				{...props}
				children={(field: FieldApi<any, any>) => {
					// @ts-expect-error - custom metadata
					field.idb = field.state.meta;

					// custom onChange handler
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

export interface IDBFieldMeta<T = any> {
	/** This is a custom function that is used to update the field value */
	handleChange: (value: T) => void
	/** Whether the field has been synced with the database. Only for debounced fields, which don't update immediately */
	synced: boolean
	/** Data for the relation picker */
	data: T extends any[] ? T : T[]
}

declare module '@tanstack/react-form' {
	interface FieldApi {
		/** Metadata specific to InstantDB */
		idb: IDBFieldMeta<this['state']['value']>
	}
}
