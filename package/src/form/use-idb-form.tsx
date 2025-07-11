/* eslint-disable @typescript-eslint/no-explicit-any */
import { TransactionChunk } from '@instantdb/core';
import { DataAttrDef, EntitiesDef, id, InstantReactWebDatabase, InstaQLParams, InstaQLResult, LinkAttrDef, LinksDef } from '@instantdb/react';
import { DeepValue, FieldApi, FormOptions, useForm } from '@tanstack/react-form';
import { useCallback, useEffect, useRef } from 'react';
import { z } from 'zod';

import { internalCreateIDBEntityZodSchema } from '../form/zod';
import { logger } from '../utils/logger';

export type EntityLinks = Record<string, LinkAttrDef<any, any>>;

/** The type of form to be used. Either update or create */
export type IDBFormType = 'update' | 'create';

/** The schema of an InstantDB database. Using InstantSchemaDef causes major typescript inference lag, so we use this simplified version instead. */
export interface IDBSchema<
	Entities extends EntitiesDef,
	Links extends LinksDef<Entities>,
> {
	entities: Entities
	links: Links
}

export type IDBSchemaType = IDBSchema<EntitiesDef, any>;
export type IDBEntityType<T extends IDBSchemaType> = keyof T['entities'];
export type IDBQueryType<T extends IDBSchemaType> = InstaQLParams<T>;

/** Extract the type of an InstantDB entity from the InstantQL result */
export type ExtractIDBEntityType<
	TSchema extends IDBSchemaType,
	TEntity extends IDBEntityType<TSchema>,
	TQuery extends IDBQueryType<TSchema>,
> = NonNullable<InstaQLResult<TSchema, TQuery>[TEntity]> extends (infer U)[] ? U : never;

export interface InstantValue {
	id: string
}

/** API for the IDB Form. This is passed to the tanstackOptions callback and can be accessed by the returned form */
interface IDBFormApi {
	/** Updates the database with the current form values */
	handleIDBUpdate: () => void
	/** Creates a new entity in the database with the current form values, and returns the id */
	handleIDBCreate: () => Promise<string | undefined>
	/** Zod schema for the form entity */
	zodSchema: z.ZodObject<any>
}

/** Checks if 2 values are different. Treats undefined and null as equal values */
export const isDifferent = (a: any, b: any) => {
	if ((a === undefined && b === null) || (a === null && b === undefined)) {
		return false;
	}
	return JSON.stringify(a) !== JSON.stringify(b);
};

/** An InstantDB wrapper for Tanstack Form. Gain type-safety and automatic database syncing. */
export function useIDBForm<
	TSchema extends IDBSchema<EntitiesDef, any>,
	TEntity extends keyof TSchema['entities'],
	TQuery extends InstaQLParams<TSchema>,
>(
	options: {
		idbOptions: {
			type: IDBFormType
			schema: TSchema
			entity: TEntity
			query: TQuery
			db: InstantReactWebDatabase<any>
			linkPickerQueries?: Partial<Record<keyof TSchema['entities'][TEntity]['links'], InstaQLParams<TSchema>>>
			defaultValues?: Partial<{
				[K in keyof TSchema['entities'][TEntity]['attrs']]: TSchema['entities'][TEntity]['attrs'][K] extends DataAttrDef<infer T, any> ? T : never
			}>
			serverDebounceFields?: Partial<Record<keyof ExtractIDBEntityType<TSchema, TEntity, TQuery>, number>>
			serverThrottleFields?: Partial<Record<keyof ExtractIDBEntityType<TSchema, TEntity, TQuery>, number>>
			// serverDebounceFields?: Partial<Record<keyof TSchema['entities'][TEntity]['attrs'], number>>
			// serverThrottleFields?: Partial<Record<keyof TSchema['entities'][TEntity]['attrs'], number>>
		}
		tanstackOptions: (idbApi: IDBFormApi) => Omit<FormOptions<ExtractIDBEntityType<TSchema, TEntity, TQuery>, any, any, any, any, any, any, any, any, any>, 'defaultValues'>
	},
) {
	type FormData = ExtractIDBEntityType<TSchema, TEntity, TQuery>;

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
	const handleIDBUpdate = useCallback(() => {
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
	const handleIDBCreate = useCallback(async () => {
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

		const newId = id();
		let baseTransaction = db.tx[entityName][newId]!.update(normalValues);
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
		return newId;
	}, [options]);

	const idbOptions = options.idbOptions;
	const db = idbOptions.db;

	// Get all options from the callback
	const entityName = idbOptions.entity as string;
	const queryValueRef = useRef<any>(null);

	// const { db } = useNewReactContext();

	// Extract link names from the query
	const queryLinkNames = Object.keys(idbOptions.query[entityName] || {}).filter(key => key !== '$');
	// Get only the links that are in the query. We don't want to add all links to our form and subscriptions
	const entity = idbOptions.schema.entities[entityName];
	const allLinks = entity.links as EntityLinks;
	const links = Object.fromEntries(
		Object.entries(allLinks).filter(([key]) => queryLinkNames.includes(key)),
	);

	// Use the extracted function to create schema and get defaults
	const { zodSchema, defaults: zodDefaults } = internalCreateIDBEntityZodSchema(entity, links);

	// Merge default values from options with zod/instant defaults
	for (const [fieldName, fieldValue] of Object.entries(idbOptions.defaultValues || {})) {
		zodDefaults[fieldName] = fieldValue;
	}

	// Create tanstack form
	const idbApi: IDBFormApi = { handleIDBUpdate, handleIDBCreate, zodSchema };
	const tanstackOptions = options.tanstackOptions(idbApi);
	const form = useForm({
		...tanstackOptions,
		defaultValues: zodDefaults as FormData,
	});

	// --------------------------------------------------------------------------------
	// IDB Query - receive external db changes and update form
	useEffect(() => {
		// ----------------------------------------
		// Sync form with database
		const unsubscribers: (() => void)[] = [];

		if (idbOptions.type === 'update') {
			const unsubscribe = db._core.subscribeQuery(idbOptions.query, (resp) => {
				if (resp.error) {
					logger.error(resp.error.message);
					return;
				}
				if (resp.data) {
					const item = (resp.data[idbOptions.entity] as any)?.[0];
					queryValueRef.current = item;

					for (const [fieldName, fieldValue] of Object.entries(item)) {
						let newValue: any = fieldValue;
						const prevValue = form.getFieldValue(fieldName);

						// For relations, use the id as value. When unlinking, the value is undefined
						if (links[fieldName] && !newValue) newValue = '';

						// Update the form if the value has changed
						if (isDifferent(prevValue, newValue)) {
							logger.log(`Received Update for ${fieldName}: ${JSON.stringify(newValue)}`);
							form.setFieldValue(fieldName, newValue);
						}

						if (!(form.getFieldMeta(fieldName) as any)?.[idbSyncedMetaName]) {
							form.setFieldMeta(fieldName, prevMeta => ({ ...prevMeta, [idbSyncedMetaName]: true }));
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
				form.setFieldMeta(fieldName, prevMeta => ({ ...prevMeta, [idbLinkDataMetaName]: linkPickerData }));
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
		const needsUpdate = isDifferent(oldValue, newValue);
		if (needsUpdate) form.setFieldMeta(fieldName, prevMeta => ({ ...prevMeta, [idbSyncedMetaName]: false }));
		return needsUpdate;
	};

	// --------------------------------------------------------------------------------
	// Update a field in InstantDB
	const getIDBUpdateTransactions = (fieldName: string) => {
		const transactions: TransactionChunk<IDBSchemaType, string>[] = [];
		if (idbOptions.type === 'create') return transactions;
		const oldValue = queryValueRef.current![fieldName];
		const newValue = form.getFieldValue(fieldName);

		// Skip update if the value hasn't changed.
		if (!isDifferent(oldValue, newValue)) {
			logger.log(`Skipping server update for field: ${fieldName}`);
			return transactions;
		}

		logger.log(`Server Update: ${fieldName} from ${JSON.stringify(oldValue)} to ${JSON.stringify(newValue)}`);
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
				const prevValues = oldValue as InstantValue[];
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
	type IDBForm = Omit<typeof form, 'Field'> & {
		/** API for the IDB Form. */
		idb: IDBFormApi
		Field: <TName extends keyof FormData & string>(props: {
			name: TName
			children: (field: IDBFieldApi<FormData, TName>) => React.ReactNode
			[key: string]: any
		}) => React.ReactNode
	};

	const newForm = form as IDBForm;
	newForm.idb = idbApi;

	return newForm;
}

type IDBFieldApi<
	TFormData,
	TName extends keyof TFormData & string,
	TValue extends DeepValue<TFormData, TName> = DeepValue<TFormData, TName>,
> = FieldApi<TFormData, TName, TValue, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined> & {
	state: {
		meta: IDBFieldMeta<TValue>
	}
};

const idbSyncedMetaName = 'idbSynced';
const idbLinkDataMetaName = 'idbLinkData';

export interface IDBFieldMeta<T = any> {
	/** Whether the field has been synced with the database. Only for debounced fields, which don't update immediately */
	[idbSyncedMetaName]: boolean
	/** Data for the relation picker */
	[idbLinkDataMetaName]: T extends any[] ? T : T[]
}
