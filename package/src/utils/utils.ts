/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataAttrDef, LinkAttrDef } from '@instantdb/react';
import { DeepKeys, DeepValue, FieldApi, FormApi } from '@tanstack/react-form';
import { z, ZodError, ZodTypeAny } from 'zod';

import { IDBFieldMeta } from '../form/use-idb-form';

interface IdbZodSchema {
	/** The zod schema for the attribute */
	zodSchema: ZodTypeAny
}
interface IdbZodSchemaOptional {
	zodSchema?: ZodTypeAny
}

/** Add a zod transform to an attribute definition in an instant schema */
export type IdbZodAttr = DataAttrDef<any, any> & IdbZodSchema;
export const addZod = <T extends DataAttrDef<any, any>>(
	input: T,
	zodSchema: ZodTypeAny,
) => {
	return {
		...input,
		zodSchema: zodSchema,
	};
};

/** Zod schema for any Instant entity - requires an id field but allows any other properties */
export const generateZodEntitySchema = (message = 'This relation is required') => z.object({
	id: z.string(),
}, { message }).passthrough();

export type IdbZodLink = LinkAttrDef<any, any> & IdbZodSchemaOptional;
/** Make an IDB link required with zod in the schema */
export const makeLinkRequired = <T extends IdbZodLink>(
	input: T,
	message?: string,
) => {
	const zodMessage = message || 'This relation is required';
	if (input.cardinality === 'one') {
		input.zodSchema = generateZodEntitySchema(zodMessage);
	} else {
		input.zodSchema = z.array(generateZodEntitySchema(zodMessage)).min(1, { message: zodMessage });
	}
};

/** Get all entity names from the schema */
export const getEntityNames = <T extends { entities: Record<string, unknown> }>(
	schema: T,
) => Object.keys(schema.entities).reduce(
	(acc, key) => ({ ...acc, [key]: key }),
	{} as { [K in keyof T['entities']]: K },
);

/** Get all fields for a specific entity */
export const getEntityFields = <
	TSchema extends { entities: Record<string, { attrs: Record<string, unknown> }> },
	TEntity extends string,
>(
	schema: TSchema,
	entityName: TEntity & keyof TSchema['entities'],
): { [P in keyof TSchema['entities'][TEntity]['attrs']]: P } => {
	return Object.keys(schema.entities[entityName].attrs).reduce(
		(acc, key) => ({ ...acc, [key]: key }),
		{} as { [P in keyof TSchema['entities'][TEntity]['attrs']]: P },
	);
};
// Example usage - const itemFields = getEntityFields(schema, 'items');

/** Get readable error message for field. Returns null if the field hasn't been touched */
export const getErrorMessageForField = (field: FieldApi<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>) => {
	if (!field.state.meta.isDirty) return null;
	return (field.state.meta.errors as ZodError[]).map(error => error.message).join(', ');
};

/** Get a field type from a tanstack form */
export type IDBExtractFieldType<
	TFormData,
	TFieldName extends DeepKeys<TFormData>,
	TFieldValue extends DeepValue<TFormData, TFieldName> = DeepValue<TFormData, TFieldName>,
> = FieldApi<TFormData, TFieldName, TFieldValue, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any> & {
	idb: IDBFieldMeta<TFieldValue>
};

// Extract the form type for a form data type
export type IDBExtractFormType<TFormData> = FormApi<
	TFormData,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any,
	any
>;
