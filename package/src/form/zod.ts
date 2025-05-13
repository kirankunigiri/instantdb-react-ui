/* eslint-disable @typescript-eslint/no-explicit-any */
import { AttrsDefs, EntitiesDef, EntityDef, LinkAttrDef, ValueTypes } from '@instantdb/react';
import { z } from 'zod';

import { generateZodEntitySchema, IDBZodAttr, IDBZodLink } from '../utils/utils';
import { IDBSchema } from './use-idb-form';

/**
 * Maps InstantDB types to Zod types.
 * Used when a instant field does not have a zod validator.
 */
function getDefaultSchema(valueType: ValueTypes): z.ZodType {
	switch (valueType) {
		case 'string':
			return z.string();
		case 'number':
			return z.number();
		case 'boolean':
			return z.boolean();
		case 'date':
			return z.number(); // instantdb uses number for dates
		case 'json':
			return z.any();
		default:
			return z.string();
	}
}

/** The default value map used by getDefaultValueByType */
const DEFAULT_VALUES_BY_TYPE: Record<string, any> = {
	boolean: false,
	string: '',
	number: 0,
	date: () => Date.now(),
} as const;

/**
 * Creates default values for useForm's initialValues parameter
 * Used when an instant field does not have a zod default
 */
function getDefaultValueByType(valueType: string): any {
	const defaultValue = DEFAULT_VALUES_BY_TYPE[valueType];
	// Use empty string for for unknown types
	if (defaultValue === undefined) return '';
	return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
}

type BasicEntity = EntityDef<AttrsDefs, Record<string, LinkAttrDef<any, any>>, void>;

export function createIDBEntityZodSchema<
	TSchema extends IDBSchema<EntitiesDef, any>,
	TEntity extends keyof TSchema['entities'],
>(
	schema: TSchema,
	entityName: TEntity,
): {
		// TODO: These types are not exactly correct. Leaving it for later as it's not a priority
		zodSchema: z.ZodObject<Record<keyof TSchema['entities'][TEntity]['attrs'], z.ZodType>>
		defaults: Record<keyof TSchema['entities'][TEntity]['attrs'], any>
	} {
	const entity = schema.entities[entityName as string] as BasicEntity;
	const entityAttrs = entity.attrs;
	const schemaObj: Record<string, z.ZodType> = {};
	const defaults: Record<string, any> = {};

	// Handle attributes
	Object.entries(entityAttrs).forEach(([key, attr]) => {
		const attrSchema = (attr as IDBZodAttr).zodSchema;
		let fieldSchema: z.ZodType;

		if (attrSchema) {
			try {
				fieldSchema = attrSchema;
				// Extract default if it exists from Zod schema
				if ('_def' in fieldSchema && 'defaultValue' in fieldSchema._def) {
					const defaultValue = fieldSchema._def.defaultValue;
					defaults[key] = typeof defaultValue === 'function' ? defaultValue() : defaultValue;
				} else {
					defaults[key] = getDefaultValueByType(attr.valueType);
				}
			} catch (e) {
				fieldSchema = getDefaultSchema(attr.valueType);
				defaults[key] = getDefaultValueByType(attr.valueType);
			}
		} else {
			fieldSchema = getDefaultSchema(attr.valueType);
			defaults[key] = getDefaultValueByType(attr.valueType);
		}

		schemaObj[key] = fieldSchema;
	});

	// Handle links
	Object.entries(entity.links).forEach(([key, link]) => {
		const linkSchema = (link as IDBZodLink).zodSchema;
		if (link.cardinality === 'one') {
			defaults[key] = null;
			if (linkSchema) {
				schemaObj[key] = linkSchema;
			} else {
				schemaObj[key] = generateZodEntitySchema().nullable();
			}
		} else {
			defaults[key] = [];
			if (linkSchema) {
				schemaObj[key] = linkSchema;
			} else {
				schemaObj[key] = z.array(generateZodEntitySchema().nullable());
			}
		}
	});

	return {
		zodSchema: z.object(schemaObj) as any,
		defaults: defaults as any,
	};
}

/** Creates a zod schema and default values for useForm's initialValues parameter */
export function createEntityZodSchemaV3(entity: BasicEntity, links: Record<string, LinkAttrDef<any, any>>): {
	zodSchema: z.ZodObject<any>
	defaults: Record<string, any>
} {
	const entityAttrs = entity.attrs;
	const schemaObj: Record<string, z.ZodType> = {};
	const defaults: Record<string, any> = {};

	Object.entries(entityAttrs).forEach(([key, attr]) => {
		const attrSchema = (attr as IDBZodAttr).zodSchema;
		let fieldSchema: z.ZodType;

		if (attrSchema) {
			try {
				fieldSchema = attrSchema;
				// Extract default if it exists from Zod schema
				if ('_def' in fieldSchema && 'defaultValue' in fieldSchema._def) {
					const defaultValue = fieldSchema._def.defaultValue;
					defaults[key] = typeof defaultValue === 'function' ? defaultValue() : defaultValue;
				} else {
					// If no Zod default, use valueType default
					defaults[key] = getDefaultValueByType(attr.valueType);
				}
			} catch (e) {
				// fallback to default schema
				fieldSchema = getDefaultSchema(attr.valueType);
				defaults[key] = getDefaultValueByType(attr.valueType);
			}
		} else {
			// fallback to default schema
			fieldSchema = getDefaultSchema(attr.valueType);
			defaults[key] = getDefaultValueByType(attr.valueType);
		}

		schemaObj[key] = fieldSchema;
	});

	// Add zod schema for links
	Object.entries(links).forEach(([key, link]) => {
		const linkSchema = (link as IDBZodLink).zodSchema;
		if (link.cardinality === 'one') {
			defaults[key] = null;
			if (linkSchema) {
				schemaObj[key] = linkSchema;
			} else {
				schemaObj[key] = generateZodEntitySchema().nullable();
			}
		} else {
			defaults[key] = [];
			if (linkSchema) {
				schemaObj[key] = linkSchema;
			} else {
				schemaObj[key] = z.array(generateZodEntitySchema().nullable());
			}
		}
	});

	return {
		zodSchema: z.object(schemaObj),
		defaults,
	};
}

/** Creates a zod schema and default values for useForm's initialValues parameter */
export function createEntityZodSchemaV2(entity: BasicEntity): {
	zodSchema: z.ZodObject<any>
	defaults: Record<string, any>
} {
	const entityAttrs = entity.attrs;
	const schemaObj: Record<string, z.ZodType> = {};
	const defaults: Record<string, any> = {};

	Object.entries(entityAttrs).forEach(([key, attr]) => {
		// Safely check and execute _zodTransform
		const transform = (attr as any)._zodTransform;
		let fieldSchema: z.ZodType;

		if (transform && typeof transform === 'function') {
			try {
				fieldSchema = transform();
				// Extract default if it exists from Zod schema
				if ('_def' in fieldSchema && 'defaultValue' in fieldSchema._def) {
					const defaultValue = fieldSchema._def.defaultValue;
					defaults[key] = typeof defaultValue === 'function' ? defaultValue() : defaultValue;
				} else {
					// If no Zod default, use valueType default
					defaults[key] = getDefaultValueByType(attr.valueType);
				}
			} catch (e) {
				// fallback to default schema
				fieldSchema = getDefaultSchema(attr.valueType);
				defaults[key] = getDefaultValueByType(attr.valueType);
			}
		} else {
			// fallback to default schema
			fieldSchema = getDefaultSchema(attr.valueType);
			defaults[key] = getDefaultValueByType(attr.valueType);
		}

		schemaObj[key] = fieldSchema;
	});

	// Add zod schema for links
	Object.entries(entity.links).forEach(([key, link]) => {
		if (link.cardinality === 'one') {
			defaults[key] = '';
			if (link._zodTransform) {
				schemaObj[key] = link._zodTransform();
			} else {
				schemaObj[key] = z.string();
			}
		} else {
			defaults[key] = [];
			if (link._zodTransform) {
				schemaObj[key] = link._zodTransform();
			} else {
				schemaObj[key] = z.array(z.string());
			}
		}
	});

	return {
		zodSchema: z.object(schemaObj),
		defaults,
	};
}

/** Creates a zod schema and default values for useForm's initialValues parameter */
export function createEntityZodSchema(entityAttrs: Record<string, any>): {
	zodSchema: z.ZodObject<any>
	defaults: Record<string, any>
} {
	const schemaObj: Record<string, z.ZodType> = {};
	const defaults: Record<string, any> = {};

	Object.entries(entityAttrs).forEach(([key, attr]) => {
		// Safely check and execute _zodTransform
		const transform = (attr as any)._zodTransform;
		let fieldSchema: z.ZodType;

		if (transform && typeof transform === 'function') {
			try {
				fieldSchema = transform();
				// Extract default if it exists from Zod schema
				if ('_def' in fieldSchema && 'defaultValue' in fieldSchema._def) {
					const defaultValue = fieldSchema._def.defaultValue;
					defaults[key] = typeof defaultValue === 'function' ? defaultValue() : defaultValue;
				} else {
					// If no Zod default, use valueType default
					defaults[key] = getDefaultValueByType(attr.valueType);
				}
			} catch (e) {
				fieldSchema = getDefaultSchema(attr.valueType);
				defaults[key] = getDefaultValueByType(attr.valueType);
			}
		} else {
			fieldSchema = getDefaultSchema(attr.valueType);
			defaults[key] = getDefaultValueByType(attr.valueType);
		}

		schemaObj[key] = fieldSchema;
	});

	return {
		zodSchema: z.object(schemaObj),
		defaults,
	};
}
