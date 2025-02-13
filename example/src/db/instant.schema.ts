import { DataAttrDef, i, InstaQLEntity } from '@instantdb/core';
import { z, ZodTypeAny } from 'zod';

import { ExtendedInstaQLEntity, i as iExt, ResolveEntityAttrs } from './instant-extended';

// Enums
export enum ITEM_CATEGORY {
	Food = 'Food',
	Furniture = 'Furniture',
	Electronics = 'Electronics',
	Tools_And_Hardware = 'Tools_And_Hardware',
	Decorations = 'Decorations',
	Other = 'Other',
}

// const _schema = iExt.schema({
// 	entities: {
// 		persons: iExt.entity({
// 			name: iExt.string().unique().indexed(),
// 			email: iExt.string().unique().indexed().withZod(() => z.string().email().min(5).max(100)),
// 		}),
// 		items: iExt.entity({
// 			name: iExt.string(),
// 			shareable: iExt.boolean(),
// 			category: iExt.string().withZod(() => z.nativeEnum(ITEM_CATEGORY)),
// 			date: iExt.date().indexed().withZod(() => z.number().min(new Date('2020-01-01').getTime())),
// 		}),
// 		houseRooms: iExt.entity({
// 			name: iExt.string(),
// 			description: iExt.string(),
// 			testDefaultValue: iExt.string(),
// 		}),
// 	},
// 	links: {
// 		personRoom: {
// 			forward: { on: 'persons', has: 'one', label: 'room' },
// 			reverse: { on: 'houseRooms', has: 'many', label: 'people' },
// 		},
// 		itemRoom: {
// 			forward: { on: 'items', has: 'one', label: 'room' },
// 			reverse: { on: 'houseRooms', has: 'many', label: 'items' },
// 		},
// 		itemOwner: {
// 			forward: { on: 'items', has: 'one', label: 'owner' },
// 			reverse: { on: 'persons', has: 'many', label: 'items' },
// 		},
// 	},
// });

// const addZod = (input: DataAttrDef<any, any>) => {
// 	return {
// 		...input,
// 		withZod: (zodTransform: () => ZodTypeAny) => ({
// 			...input,
// 			_zodTransform: zodTransform,
// 		}),
// 	};
// };

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
			email: addZod(i.string().unique().indexed(),
				() => z.string().email()),
		}),
		items: i.entity({
			name: i.string(),
			shareable: i.boolean(),
			category: i.string(),
			date: i.date().indexed(),
		}),
		houseRooms: i.entity({
			name: i.string(),
			description: i.string(),
			testDefaultValue: i.string(),
		}),
	},
	links: {
		personRoom: {
			forward: { on: 'persons', has: 'one', label: 'room' },
			reverse: { on: 'houseRooms', has: 'many', label: 'people' },
		},
		itemRoom: {
			forward: { on: 'items', has: 'one', label: 'room' },
			reverse: { on: 'houseRooms', has: 'many', label: 'items' },
		},
		itemOwner: {
			forward: { on: 'items', has: 'one', label: 'owner' },
			reverse: { on: 'persons', has: 'many', label: 'items' },
		},
	},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;

// Helper to get any entity type
// export type ResolvedEntity<K extends keyof AppSchema['entities']> = ResolveEntityAttrs<AppSchema['entities'][K]>;

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

// Test that type inference works
type ItemOG = InstaQLEntity<AppSchema, 'items'>;
type ItemModified = ExtendedInstaQLEntity<AppSchema, 'items'>;
