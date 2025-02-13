import { DataAttrDef, i, InstaQLEntity } from '@instantdb/core';
import { z, ZodTypeAny } from 'zod';

// Enums
export enum ITEM_CATEGORY {
	Food = 'Food',
	Furniture = 'Furniture',
	Electronics = 'Electronics',
	Tools_And_Hardware = 'Tools_And_Hardware',
	Decorations = 'Decorations',
	Other = 'Other',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addZod = <T extends DataAttrDef<any, any>>(
	input: T,
	zodTransform: () => ZodTypeAny,
): T & { _zodTransform: () => ZodTypeAny } => {
	return {
		...input,
		_zodTransform: zodTransform,
	};
};

const _schema = i.schema({
	entities: {
		persons: i.entity({
			name: i.string().unique().indexed(),
			email: addZod(
				i.string().unique().indexed(),
				() => z.string().email().min(5).max(100),
			),
		}),
		items: i.entity({
			name: i.string(),
			shareable: i.boolean(),
			category: addZod(
				i.string(),
				() => z.nativeEnum(ITEM_CATEGORY),
			),
			date: addZod(
				i.date().indexed(),
				() => z.number().min(new Date('2020-01-01').getTime()).default(Date.now),
			),
		}),
		rooms: i.entity({
			name: i.string(),
			description: i.string(),
			testDefaultValue: i.string(),
		}),
	},
	links: {
		personRoom: {
			forward: { on: 'persons', has: 'one', label: 'room' },
			reverse: { on: 'rooms', has: 'many', label: 'people' },
		},
		itemRoom: {
			forward: { on: 'items', has: 'one', label: 'room' },
			reverse: { on: 'rooms', has: 'many', label: 'items' },
		},
		itemOwner: {
			forward: { on: 'items', has: 'one', label: 'owner' },
			reverse: { on: 'persons', has: 'many', label: 'items' },
		},
	},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;

// List of entity names
export const entityNames = Object.keys(_schema.entities).reduce(
	(acc, key) => ({ ...acc, [key]: key }),
	{} as { [K in keyof typeof _schema.entities]: K },
);

// Get all fields for a specific entity
export const getEntityFields = <K extends keyof AppSchema['entities']>(
	entityName: K,
): { [P in keyof AppSchema['entities'][K]['attrs']]: P } => {
	return Object.keys(_schema.entities[entityName].attrs).reduce(
		(acc, key) => ({ ...acc, [key]: key }),
		{} as { [P in keyof AppSchema['entities'][K]['attrs']]: P },
	);
};

// Not changing the name to include id
export const getEntityFieldsAndRelations = <K extends keyof AppSchema['entities']>(
	entityName: K,
): { [P in keyof InstaQLEntity<AppSchema, K, { owner: {}, room: {} }>]: P } => {
	// Get regular fields
	const fields = Object.keys(_schema.entities[entityName].attrs);

	// Get relation fields by checking links
	const relationFields = Object.entries(_schema.links)
		.filter(([_, link]) => link.forward.on === entityName)
		.map(([_, link]) => `${link.forward.label}Id`);

	// Combine both regular and relation fields
	return [...fields, ...relationFields].reduce(
		(acc, key) => ({ ...acc, [key]: key }),
		{} as { [P in keyof InstaQLEntity<AppSchema, K, { owner: {}, room: {} }>]: P },
	);
};

// Value, but not key, transformed to include Id
// export const getEntityFieldsAndRelations = <K extends keyof AppSchema['entities']>(
// 	entityName: K,
// ): { [P in keyof InstaQLEntity<AppSchema, K, { owner: {}, room: {} }>]: P extends 'owner' | 'room' ? `${P}Id` : P } => {
// 	// Get regular fields
// 	const fields = Object.keys(_schema.entities[entityName].attrs);

// 	// Get relation fields by checking links
// 	const relationFields = Object.entries(_schema.links)
// 		.filter(([_, link]) => link.forward.on === entityName)
// 		.map(([_, link]) => `${link.forward.label}Id`);

// 	// Combine both regular and relation fields
// 	return [...fields, ...relationFields].reduce(
// 		(acc, key) => {
// 		// Remove 'Id' from the key when looking up the value
// 			const valueKey = key.endsWith('Id') ? key.slice(0, -2) : key;
// 			return { ...acc, [key]: valueKey };
// 		},
// 		{} as { [P in keyof InstaQLEntity<AppSchema, K, { owner: {}, room: {} }>]: P extends 'owner' | 'room' ? `${P}Id` : P },
// 	);
// };

// Key and value transformed to include Id
// export const getEntityFieldsAndRelations = <K extends keyof AppSchema['entities']>(
// 	entityName: K,
// ): { [P in keyof InstaQLEntity<AppSchema, K, { owner: {}, room: {} }>]: P extends 'owner' | 'room' ? `${P}Id` : P } extends infer T ? {
// 	[P in keyof T as P extends 'owner' | 'room' ? `${P}Id` : P]: T[P]
// } : never => {
// 	// Get regular fields
// 	const fields = Object.keys(_schema.entities[entityName].attrs);

// 	// Get relation fields by checking links
// 	const relationFields = Object.entries(_schema.links)
// 		.filter(([_, link]) => link.forward.on === entityName)
// 		.map(([_, link]) => {
// 			const label = link.forward.label;
// 			return { [`${label}Id`]: `${label}Id` };
// 		})
// 		.reduce((acc, curr) => ({ ...acc, ...curr }), {});

// 	// Combine both regular and relation fields
// 	return {
// 		...Object.keys(fields).reduce((acc, key) => ({ ...acc, [key]: key }), {}),
// 		...relationFields,
// 	} as { [P in keyof InstaQLEntity<AppSchema, K, { owner: {}, room: {} }>]: P extends 'owner' | 'room' ? `${P}Id` : P } extends infer T ? {
// 		[P in keyof T as P extends 'owner' | 'room' ? `${P}Id` : P]: T[P]
// 	} : never;
// };

// Test that type inference works
type Item = InstaQLEntity<AppSchema, 'items'>;
const itemFields = getEntityFieldsAndRelations('items');

// Scratchpad
// item.owner
// IDBCustomField with fieldName="owner" will receive id(s) of strings as value, array of all objects as data
// IDBCustomField can take in a custom list query for all persons to pick from
// onChange will update the link instead of changing any actual values
