/* eslint-disable @typescript-eslint/no-explicit-any */
import { IContainEntitiesAndLinks } from '@instantdb/core/dist/module/schemaTypes';
import { EntitiesDef, InstaQLParams, InstaQLResult } from '@instantdb/react';
import { FieldApi, FormOptions, formOptions, useForm } from '@tanstack/react-form';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { EntityLinks } from '..';
import { createEntityZodSchemaV2, createEntityZodSchemaV3 } from '../form/zod';
import { NewFormProvider, useNewReactContext } from '../utils/provider';

interface InstantValue {
	id: string
}

type ConvertedLinksToStrings<
	T,
	Links extends EntityLinks,
> = {
	[K in keyof T]: K extends keyof Links
		? Links[K]['cardinality'] extends 'one'
			? string
			: string[]
		: T[K]
};

// TODO: Allow all original form options from tanstack useForm
// TODO: move query up to args
// TODO: Make query optional and use the entity schema to create a default query
export function useIDBForm<
	Schema extends IContainEntitiesAndLinks<EntitiesDef, any>,
	T extends keyof Schema['entities'],
	Q extends InstaQLParams<Schema>,
>(
	schema: Schema,
	entity: T,
	options: {
		debounceValues?: Partial<Record<keyof (NonNullable<InstaQLResult<Schema, Q>[T]> extends (infer U)[] ? U : never), number>>
		defaultValues?: Partial<NonNullable<InstaQLResult<Schema, Q>[T]> extends (infer U)[] ? U : never>
		query: Q
		formOptions?: FormOptions<NonNullable<InstaQLResult<Schema, Q>[T]> extends (infer U)[] ? U : never>
	},
) {
	console.log('running useIDBForm');

	type FormData = NonNullable<InstaQLResult<Schema, Q>[T]> extends (infer U)[] ? U : never;
	const entityName = entity as string;

	// Use the extracted function to create schema and get defaults
	const { zodSchema, defaults: zodDefaults } = createEntityZodSchemaV3(schema.entities[entityName]);

	// Merge default values from options with zod defaults
	// TODO: Test with create form
	for (const [fieldName, fieldValue] of Object.entries(options.defaultValues || {})) {
		zodDefaults[fieldName] = fieldValue;
	}

	const { db } = useNewReactContext();
	const links = schema.entities[entity as string].links as EntityLinks;

	const formOpts = formOptions<FormData>({
		defaultValues: zodDefaults as FormData,
	});

	const form = useForm({
		...formOpts,
		validators: {
			onChange: zodSchema,
		},
	});

	// useLayoutEffect(() => {
	// 	for (const [fieldName, link] of Object.entries(links)) {
	// 		form.setFieldMeta(fieldName, prevMeta => ({ ...prevMeta, data: [] }));
	// 	}
	// }, []);

	useEffect(() => {
		// Main entity query
		db.subscribeQuery(options.query, (resp) => {
			if (resp.error) {
				console.error(resp.error.message);
				return;
			}
			if (resp.data) {
				const item = (resp.data[entity] as any)?.[0];

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
						// console.log('setting field value', fieldName, newValue);
						form.setFieldValue(fieldName, newValue);
					}
					if (!(form.getFieldMeta(fieldName))?.synced) {
						form.setFieldMeta(fieldName, prevMeta => ({ ...prevMeta, synced: true }));
					}
				}
			}
		});

		// Relation queries
		for (const [fieldName, link] of Object.entries(links)) {
			// TODO: Relation query overrides - create a new link query map instead of asking dev to place them in the base query
			const query = {
				[link.entityName]: {},
			};

			const overrideRelationQuery = options.query[link.entityName];
			if (overrideRelationQuery) {
				query[link.entityName] = overrideRelationQuery;
			}
			// console.log('subscribing to relation query', query);

			db.subscribeQuery(query, (resp) => {
				const linkPickerData = resp.data?.[link.entityName] as any[];
				// console.log(fieldName, 'link picker data', linkPickerData);
				form.setFieldMeta(fieldName, prevMeta => ({ ...prevMeta, data: linkPickerData }));
			});
		}
	}, []);

	// TODO: this is just temporary. later, use an actual debounce library that will run after the user stops typing for a certain amount of time
	const timeoutRef = useRef<NodeJS.Timeout>();
	const debouncedTransact = useCallback((callback: () => void) => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		timeoutRef.current = setTimeout(() => {
			callback();
		}, 500);
	}, []);

	const customOnChange = (field: FieldApi<any, any>, value: any) => {
		const oldValue = field.state.value;
		field.handleChange(value);
		const id = form.getFieldValue('id');
		form.setFieldMeta(field.name, prevMeta => ({ ...prevMeta, synced: false }));

		const link = links[field.name];
		if (link) {
			// Relation field db update
			const tx = db.tx[entityName][id]!;
			const cardinality = link.cardinality;
			const transactions = [];

			if (cardinality === 'many') {
				// Find the difference between the old and new values, unlink the old values and link the new values
				const newValue = value as InstantValue[];
				const prevValues = oldValue as InstantValue[];
				console.log('prevValues', prevValues);
				console.log('newValue', newValue);
				const idsToUnlink = prevValues.filter((item: InstantValue) =>
					!newValue.some(newItem => newItem.id === item.id),
				).map(item => item.id);
				const idsToLink = newValue.filter((item: InstantValue) =>
					!prevValues.some(prevItem => prevItem.id === item.id),
				).map(item => item.id);
				console.log('linkresult', idsToUnlink, idsToLink);

				if (idsToUnlink.length > 0) transactions.push(tx.unlink({ [field.name]: idsToUnlink }));
				if (idsToLink.length > 0) transactions.push(tx.link({ [field.name]: idsToLink }));
			} else if (cardinality === 'one') {
				// Unlink the old value and link the new value
				const newValue = field.state.value as InstantValue;
				if ((oldValue as InstantValue).id !== newValue.id) {
					transactions.push(tx.link({ [field.name]: newValue.id }));
				}
			}

			if (transactions.length > 0) db.transact(transactions);
		} else {
			// Normal field db update
			// TODO: Only use debounce based on options.debounceValues
			// debouncedTransact(() => {
			if (field.state.meta.errors.length === 0) {
				db.transact(db.tx[entity][id]!.update({ [field.name]: field.state.value }));
			}
			// });
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

// export interface IDBFieldMeta {
// 	/** This is a custom function that is used to update the field value */
// 	handleChange: (e: any) => void
// 	/** Whether the field has been synced with the database. Only for debounced fields, which don't update immediately */
// 	synced: boolean
// 	/** Data for the relation picker */
// 	data: any[]
// }

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
