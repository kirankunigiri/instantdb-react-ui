/* eslint-disable @typescript-eslint/no-explicit-any */
import { TransactionChunk } from '@instantdb/core';
import { EntitiesDef, id, InstantSchemaDef, InstaQLParams, InstaQLResult, LinksDef } from '@instantdb/react';
import { DeepValue, FieldApi, FormApi, FormOptions, formOptions, useForm } from '@tanstack/react-form';
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
	options: {
		idbOptions: Omit<FormOptions<NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined>, 'defaultValues'> & {
			type: IDBFormType
			schema: TSchema
			entity: TEntity
			query: TQuery
			linkPickerQueries?: TLinkQueries
			defaultValues?: Partial<NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never>
		}
		tanstackOptions: (handleIdbUpdate: () => void, handleIdbCreate: () => void) => Omit<FormOptions<NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined>, 'defaultValues'>
	},
) {
	type FormData = NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never;
	type MyFormOptions = FormOptions<FormData, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined>;

	/** Updates the database with the current form values */
	const handleIdbUpdate = useCallback(() => {
		if (options.idbOptions.type !== 'update' || !form) return;

		const formState = form.store.state.values;
		const formStateKeys = Object.keys(formState as any);

		let transactions: TransactionChunk<InstantSchemaDef<any, any, any>, string>[] = [];
		for (const fieldName of formStateKeys) {
			transactions = transactions.concat(updateIDB(fieldName));
		}
		if (transactions.length > 0) db.transact(transactions);
		console.log('finished server update');
	}, [options]);

	/** Creates a new entity in the database with the current form values */
	const handleIdbCreate = useCallback(async () => {
		if (options.idbOptions.type !== 'create' || !form) return;
		const value = form.state.values;

		const linkValues: Record<string, any> = {};
		const normalValues: Record<string, any> = {};

		for (const [fieldName, fieldValue] of Object.entries(value as object)) {
			if (links[fieldName]) {
				linkValues[fieldName] = fieldValue;
			} else {
				normalValues[fieldName] = fieldValue;
			}
		}

		let baseTransaction = db.tx[entityName][id()]!.update(normalValues);
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
	}, [options]);

	const tanstackOptions = options.tanstackOptions(handleIdbUpdate, handleIdbCreate);
	const idbOptions = options.idbOptions;

	// Get all options from the callback
	const entityName = idbOptions.entity as string;
	const queryValueRef = useRef<any>(null);

	const { db } = useNewReactContext();
	const links = idbOptions.schema.entities[idbOptions.entity as string].links as EntityLinks;

	// Use the extracted function to create schema and get defaults
	const { zodSchema, defaults: zodDefaults } = createEntityZodSchemaV3(idbOptions.schema.entities[entityName]);

	// Merge default values from options with zod defaults
	for (const [fieldName, fieldValue] of Object.entries(idbOptions.defaultValues || {})) {
		zodDefaults[fieldName] = fieldValue;
	}

	// const form = useForm(tanstackOptions);
	const form = useForm({
		...tanstackOptions,
		defaultValues: zodDefaults as FormData,

		// TODO: We need to pass this to tanstackOptions function instead for dev to define
		validators: { onChange: zodSchema },
	});

	// --------------------------------------------------------------------------------
	// IDB Query - sync form with database
	useEffect(() => {
		// ----------------------------------------
		// Sync database with form
		const unsubscribers: (() => void)[] = [];

		if (idbOptions.type === 'update') {
			const unsubscribe = db._core.subscribeQuery(idbOptions.query, (resp) => {
				if (resp.error) {
					console.error(resp.error.message);
					return;
				}
				if (resp.data) {
					const item = (resp.data[idbOptions.entity] as any)?.[0];
					queryValueRef.current = item;

					for (const [fieldName, fieldValue] of Object.entries(item)) {
						let newValue: any = fieldValue;
						const prevValue = form.getFieldValue(fieldName);

						// For relations, use the id as value. When unlinking, the value is undefined
						const link = links[fieldName];
						if (link && !newValue) newValue = '';

						// Update the form if the value has changed
						if (JSON.stringify(prevValue) !== JSON.stringify(newValue)) {
							console.log(`Received Update for ${fieldName}: ${JSON.stringify(newValue)}`);
							form.setFieldValue(fieldName, newValue);
						}
						if (!(form.getFieldMeta(fieldName))?.synced) {
							form.setFieldMeta(fieldName, prevMeta => ({ ...prevMeta, synced: true }));
						}
					}

					form.validate('change');
				}
			});
			unsubscribers.push(unsubscribe);
		}

		// ----------------------------------------
		// Link picker queries
		for (const [fieldName, link] of Object.entries(links)) {
			const linkPickerQuery = idbOptions.linkPickerQueries?.[fieldName] || {
				[link.entityName]: {},
			};

			const unsubscribe = db._core.subscribeQuery(linkPickerQuery, (resp) => {
				const linkPickerData = resp.data?.[link.entityName] as any[];
				form.setFieldMeta(fieldName, prevMeta => ({ ...prevMeta, data: linkPickerData }));
			});
			unsubscribers.push(unsubscribe);
		}

		// Cleanup function to unsubscribe from all queries
		return () => {
			unsubscribers.forEach(unsubscribe => unsubscribe());
		};
	}, [idbOptions]);

	// --------------------------------------------------------------------------------
	// Update a field in InstantDB
	const updateIDB = (fieldName: string) => {
		const transactions: TransactionChunk<InstantSchemaDef<any, any, any>, string>[] = [];
		if (idbOptions.type === 'create') return transactions;
		const oldValue = queryValueRef.current![fieldName];
		const newValue = form.getFieldValue(fieldName);

		// Skip update if the value hasn't changed. TODO: Use form touched/dirty as well
		if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
			console.log(`Skipping server update for field: ${fieldName}`);
			return transactions;
		}

		// console.log(`Server Update: ${fieldName} from ${oldValue} to ${newValue}`);
		console.log(`Server Update: ${fieldName} from ${JSON.stringify(oldValue)} to ${JSON.stringify(newValue)}`);

		form.setFieldMeta(fieldName, prevMeta => ({ ...prevMeta, synced: false }));
		const id = form.getFieldValue('id') as string;

		const link = links[fieldName];
		const tx = db.tx[entityName][id]!;

		if (link) {
			// Relation field db update
			const cardinality = link.cardinality;

			if (cardinality === 'many') {
				// Find the difference between the old and new values, then unlink the old values and link the new values
				const newValueList = newValue as InstantValue[];
				// Imagine person A and B is linked. We unlink A (which updates) then unlink B (which doesn't update because the field requires at least one link and we have a validation error.). Now the field is empty, but when we link person C, we fail to unlink person B beause prevValue was null. The solution to this is to use the queryValue from the database as the prevValue instead of the field value
				// TODO: For create form, you can't do this (use the field value instead)
				const prevValues = oldValue as InstantValue[]; // TODO: replace with newValueList
				const idsToUnlink = prevValues
					.filter((item: InstantValue) => !newValueList.some(newItem => newItem.id === item.id))
					.map(item => item.id);
				const idsToLink = newValueList
					.filter((item: InstantValue) => !prevValues.some(prevItem => prevItem.id === item.id))
					.map(item => item.id);

				if (idsToUnlink.length > 0) transactions.push(tx.unlink({ [fieldName]: idsToUnlink }));
				if (idsToLink.length > 0) transactions.push(tx.link({ [fieldName]: idsToLink }));
			} else if (cardinality === 'one') {
				// Unlink the old value and link the new value
				const newValueSingle = newValue as InstantValue;
				if (!oldValue || (oldValue as InstantValue).id !== newValueSingle.id) {
					transactions.push(tx.link({ [fieldName]: newValueSingle.id }));
				}
			}
		} else {
			// Normal field db update
			transactions.push(tx.update({ [fieldName]: newValue }));
		}
		return transactions;
	};

	// --------------------------------------------------------------------------------
	// Wrap field component
	const OriginalField = form.Field;
	const WrappedField = <TName extends keyof FormData & string>(props: {
		children: (field: FieldApi<FormData, TName, DeepValue<FormData, TName>, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined>) => React.ReactNode
		name: TName
		[key: string]: any
	}) => {
		return (
			<OriginalField
				{...props}
				children={(field: FieldApi<FormData, TName, DeepValue<FormData, TName>, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined>) => {
					// @ts-expect-error - custom metadata
					field.idb = field.state.meta;
					return props.children(field);
				}}
			/>
		);
	};
	WrappedField.displayName = 'WrappedField';
	form.Field = WrappedField as any;

	type NewForm = typeof form & {
		newTestString: string
	};
	const newForm = form as NewForm;
	newForm.newTestString = 'test';

	return newForm;
}

type ExtendedForm<TFormData> = ReturnType<typeof useForm<TFormData, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined>> & {
	newTestString: string
};

interface IDBFieldMeta<T = any> {
	/** This is a custom function that is used to update the field value */
	handleChange: (value: T) => void
	/** Whether the field has been synced with the database. Only for debounced fields, which don't update immediately */
	synced: boolean
	/** Data for the relation picker */
	data: T extends any[] ? T : T[]
}
