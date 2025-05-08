/* eslint-disable @typescript-eslint/no-explicit-any */
import { TransactionChunk } from '@instantdb/core';
import { EntitiesDef, id, InstantSchemaDef, InstaQLParams, InstaQLResult, LinksDef } from '@instantdb/react';
import { DeepValue, FieldApi, FormApi, FormOptions, formOptions, useForm } from '@tanstack/react-form';
import { useCallback, useEffect, useRef } from 'react';
import { z } from 'zod';

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

/** API for the IDB Form. This is passed to the tanstackOptions callback and can be accessed by the returned form */
interface IDBFormApi {
	/** Updates the database with the current form values */
	handleIdbUpdate: () => void
	/** Creates a new entity in the database with the current form values */
	handleIdbCreate: () => void
	/** Zod schema for the form entity */
	zodSchema: z.ZodObject<any>
}

/** An InstantDB wrapper for Tanstack Form. Gain type-safety and automatic database syncing. */
export function useIDBForm2<
	TSchema extends IContainEntitiesAndLinks<EntitiesDef, any>,
	TEntity extends keyof TSchema['entities'],
	TQuery extends InstaQLParams<TSchema>,
	TLinkQueries extends Partial<Record<keyof TSchema['entities'][TEntity]['links'], InstaQLParams<TSchema>>>,
>(
	options: {
		idbOptions: Omit<FormOptions<NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never, any, any, any, any, any, any, any, any, any>, 'defaultValues'> & {
			type: IDBFormType
			schema: TSchema
			entity: TEntity
			query: TQuery
			linkPickerQueries?: TLinkQueries
			defaultValues?: Partial<NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never>
			serverDebounceFields?: Partial<Record<keyof (NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never), number>>
			serverThrottleFields?: Partial<Record<keyof (NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never), number>>
		}
		tanstackOptions: (idbApi: IDBFormApi) => Omit<FormOptions<NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never, any, any, any, any, any, any, any, any, any>, 'defaultValues'>
	},
) {
	type FormData = NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never;
	type MyFormOptions = FormOptions<FormData, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined>;

	// Refs for managing timers and state
	const timerRef = useRef<NodeJS.Timeout>(null);
	const lastUpdateRef = useRef<Record<string, number>>({});
	const pendingThrottledUpdatesRef = useRef<Record<string, boolean>>({});
	const pendingFieldRef = useRef<string | null>(null);
	const throttleTimerRef = useRef<Record<string, NodeJS.Timeout>>({});

	// Cleanup timers
	useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
			Object.values(throttleTimerRef.current).forEach(clearTimeout);
			pendingFieldRef.current = null;
		};
	}, []);

	/** Updates the database with the current form values */
	const handleIdbUpdate = useCallback(() => {
		if (options.idbOptions.type !== 'update' || !form) return;

		// For reference, this is what the update code does without any debounce/throttle
		// const formState = form.store.state.values;
		// const formStateKeys = Object.keys(formState as any);
		// let transactions: TransactionChunk<InstantSchemaDef<any, any, any>, string>[] = [];
		// for (const fieldName of formStateKeys) {
		// 	transactions = transactions.concat(updateIDB(fieldName));
		// }
		// if (transactions.length > 0) db.transact(transactions);

		const formStateKeys = Object.keys(form.store.state.values as any);
		const fieldsToUpdate = formStateKeys.filter(checkIDBNeedsUpdate);
		if (fieldsToUpdate.length === 0) return;

		// Handle multiple fields or different pending field - immediate update
		if (fieldsToUpdate.length > 1 || (pendingFieldRef.current && !fieldsToUpdate.includes(pendingFieldRef.current))) {
			clearTimeout(timerRef.current);
			timerRef.current = pendingFieldRef.current = null;
			pendingThrottledUpdatesRef.current = {};

			const transactions = fieldsToUpdate.flatMap(getIDBUpdateTransactions);
			if (transactions.length > 0) db.transact(transactions);
			return;
		}

		const fieldName = fieldsToUpdate[0];
		const debounceTime = options.idbOptions.serverDebounceFields?.[fieldName] ?? 0;
		const throttleTime = options.idbOptions.serverThrottleFields?.[fieldName] ?? 0;

		const executeUpdate = () => {
			const transactions = getIDBUpdateTransactions(fieldName);
			if (transactions.length > 0) db.transact(transactions);
			return Date.now();
		};

		// Handle debounce
		if (debounceTime > 0) {
			clearTimeout(timerRef.current);
			pendingFieldRef.current = fieldName;
			timerRef.current = setTimeout(() => {
				executeUpdate();
				timerRef.current = pendingFieldRef.current = null;
			}, debounceTime);
			return;
		}

		// Handle throttle
		if (throttleTime > 0) {
			const now = Date.now();
			const lastUpdate = lastUpdateRef.current[fieldName] ?? 0;
			const timeSinceLastUpdate = now - lastUpdate;

			clearTimeout(throttleTimerRef.current[fieldName]);

			if (timeSinceLastUpdate >= throttleTime) {
				lastUpdateRef.current[fieldName] = executeUpdate();
				pendingThrottledUpdatesRef.current[fieldName] = false;
			} else if (!pendingThrottledUpdatesRef.current[fieldName]) {
				pendingThrottledUpdatesRef.current[fieldName] = true;
				setTimeout(() => {
					if (pendingThrottledUpdatesRef.current[fieldName]) {
						lastUpdateRef.current[fieldName] = executeUpdate();
						pendingThrottledUpdatesRef.current[fieldName] = false;
					}
				}, throttleTime - timeSinceLastUpdate);
			}

			// Final update timer
			throttleTimerRef.current[fieldName] = setTimeout(() => {
				lastUpdateRef.current[fieldName] = executeUpdate();
				pendingThrottledUpdatesRef.current[fieldName] = false;
				delete throttleTimerRef.current[fieldName];
			}, throttleTime);
			return;
		}

		// No debounce or throttle - immediate update
		executeUpdate();
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

	const idbOptions = options.idbOptions;

	// Get all options from the callback
	const entityName = idbOptions.entity as string;
	const queryValueRef = useRef<any>(null);

	const { db } = useNewReactContext();
	const links = idbOptions.schema.entities[idbOptions.entity as string].links as EntityLinks;

	// Use the extracted function to create schema and get defaults
	const { zodSchema, defaults: zodDefaults } = createEntityZodSchemaV3(idbOptions.schema.entities[entityName]);

	// Merge default values from options with zod/instant defaults
	for (const [fieldName, fieldValue] of Object.entries(idbOptions.defaultValues || {})) {
		zodDefaults[fieldName] = fieldValue;
	}

	// Create tanstack form
	const idbApi = { handleIdbUpdate, handleIdbCreate, zodSchema };
	const tanstackOptions = options.tanstackOptions(idbApi);
	const form = useForm({
		...tanstackOptions,
		defaultValues: zodDefaults as FormData,
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
	// Check if a field needs to be updated
	const checkIDBNeedsUpdate = (fieldName: string) => {
		const oldValue = queryValueRef.current![fieldName];
		const newValue = form.getFieldValue(fieldName);
		const needsUpdate = JSON.stringify(oldValue) !== JSON.stringify(newValue);
		if (needsUpdate) form.setFieldMeta(fieldName, prevMeta => ({ ...prevMeta, synced: false }));
		return needsUpdate;
	};

	// --------------------------------------------------------------------------------
	// Update a field in InstantDB
	const getIDBUpdateTransactions = (fieldName: string) => {
		const transactions: TransactionChunk<InstantSchemaDef<any, any, any>, string>[] = [];
		if (idbOptions.type === 'create') return transactions;
		const oldValue = queryValueRef.current![fieldName];
		const newValue = form.getFieldValue(fieldName);

		// Skip update if the value hasn't changed.
		if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
			console.log(`Skipping server update for field: ${fieldName}`);
			return transactions;
		}

		// console.log(`Server Update: ${fieldName} from ${oldValue} to ${newValue}`);
		console.log(`Server Update: ${fieldName} from ${JSON.stringify(oldValue)} to ${JSON.stringify(newValue)}`);

		// form.setFieldMeta(fieldName, prevMeta => ({ ...prevMeta, synced: false }));
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
		/** API for the IDB Form. */
		idb: IDBFormApi
	};
	const newForm = form as NewForm;
	newForm.idb = idbApi;

	return newForm;
}

// type ExtendedForm<TFormData> = ReturnType<typeof useForm<TFormData, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined>> & {
// 	newTestString: string
// };

// interface IDBFieldMeta<T = any> {
// 	/** This is a custom function that is used to update the field value */
// 	handleChange: (value: T) => void
// 	/** Whether the field has been synced with the database. Only for debounced fields, which don't update immediately */
// 	synced: boolean
// 	/** Data for the relation picker */
// 	data: T extends any[] ? T : T[]
// }
