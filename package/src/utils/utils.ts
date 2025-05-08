/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataAttrDef, LinkAttrDef } from '@instantdb/react';
import { FieldApi } from '@tanstack/react-form';
import { useCallback, useRef, useState } from 'react';
import { z, ZodError, ZodTypeAny } from 'zod';

import { IDBFormState } from '../form/form';

/** Add a zod transform to an attribute definition in an instant schema */
export const addZod = <T extends DataAttrDef<any, any>>(
	input: T,
	zodTransform: () => ZodTypeAny,
): T & { _zodTransform: () => ZodTypeAny } => {
	return {
		...input,
		_zodTransform: zodTransform,
	};
};

/** Zod schema for any Instant entity - requires an id field but allows any other properties */
export const generateZodEntitySchema = (message = 'This relation is required') => z.object({
	id: z.string(),
}, { message }).passthrough();

export const makeLinkRequired = <T extends LinkAttrDef<any, any>>(
	input: T,
	message?: string,
) => {
	const zodMessage = message || 'This relation is required';
	if (input.cardinality === 'one') {
		input['_zodTransform'] = () => generateZodEntitySchema(zodMessage);
	} else {
		input['_zodTransform'] = () => z.array(generateZodEntitySchema(zodMessage)).min(1, { message: zodMessage });
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

/** This hook will automatically re-render your parent component when the IDBForm state changes */
export const useIDBFormState = () => {
	const formRef = useRef<IDBFormState>(null);
	const [formState, setFormState] = useState<IDBFormState>(null);

	// useCallback will avoid unnecessary re-renders when passing handleFormChange to IDBForm
	const handleFormChange = useCallback(() => {
		if (formRef.current) setFormState(formRef.current);
	}, [formRef]);

	return { formRef, formState, handleFormChange };
};

/** Get readable error message for field. Returns null if the field hasn't been touched */
export const getErrorMessageForField = (field: FieldApi<any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any, any>) => {
	if (!field.state.meta.isDirty) return null;
	return (field.state.meta.errors as ZodError[]).map(error => error.message).join(', ');
};
