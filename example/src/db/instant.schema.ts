import { IContainEntitiesAndLinks } from '@instantdb/core/dist/module/schemaTypes';
import { EntitiesDef, i, InstaQLEntity } from '@instantdb/react';
import { isTemplateSpan } from 'typescript';
import { z } from 'zod';

// TODO: import from package causes an error where schema:push fails when parsing field.tsx
// TODO: this can be fixed by asking instant team or always importing directly from utils folder
import { addZod, makeLinkRequired } from '../../../package/src/utils/utils';

// Create a fallback function that just returns the input
// const defaultAddZod = (field: any) => field;

// Initialize with the default function
// let addZod = defaultAddZod;

// Try to import the real addZod asynchronously
// (async () => {
// 	try {
// 		const module = await import('../../../package/src/index');
// 		addZod = module.addZod;
// 	} catch {
// 		// Keep using defaultAddZod if import fails
// 	}
// })();

// Enums
export enum ITEM_CATEGORY {
	Food = 'Food',
	Furniture = 'Furniture',
	Electronics = 'Electronics',
	Tools_And_Hardware = 'Tools_And_Hardware',
	Decorations = 'Decorations',
	Other = 'Other',
}

// Schema
const _schema = i.schema({
	entities: {
		persons: i.entity({
			name: addZod(i.string().unique().indexed(),
				() => z.string().min(1, { message: 'Please enter a name' })),
			email: addZod(i.string().unique().indexed(),
				() => z.string().email({ message: 'Please enter a valid email address' }).min(5).max(100)),
		}),
		items: i.entity({
			name: addZod(i.string().unique().indexed(),
				() => z.string().min(1, { message: 'Please enter a name' })),
			shareable: addZod(i.boolean(),
				() => z.boolean().default(true)),
			category: addZod(i.string(),
				() => z.nativeEnum(ITEM_CATEGORY)),
			date: addZod(i.date().indexed(),
				() => z.number().min(new Date('2020-01-01').getTime()).default(Date.now)),
		}),
		rooms: i.entity({
			name: i.string().indexed(),
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
			forward: { on: 'items', has: 'many', label: 'owner' },
			reverse: { on: 'persons', has: 'many', label: 'items' },
		},
	},
});

// Make the owner and room links required
makeLinkRequired(_schema.entities.items.links.owner, 'Please select at least one owner');
makeLinkRequired(_schema.entities.items.links.room);

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;

// Test that type inference works
type Item = InstaQLEntity<AppSchema, 'items'>;

type EntityFields<Schema extends { entities: any }, T extends keyof Schema['entities']> =
    Record<
    	keyof (typeof _schema['entities'][T]['attrs'] &
    	  typeof _schema['entities'][T]['links']),
    	string
    >;

function getEntities<Schema extends { entities: any }>(schema: Schema) {
	return Object.fromEntries(
		Object.keys(schema.entities).map(entityName => [
			entityName,
			Object.fromEntries(
				[...Object.keys(schema.entities[entityName].attrs),
					...Object.keys(schema.entities[entityName].links)]
					.map(key => [key, key]),
			),
		]),
	) as {
		[K in keyof Schema['entities']]: EntityFields<Schema, K>
	};
}

// Example usage:
export const AllEntities = getEntities(_schema);

type Test2 = EntityFields<AppSchema, 'items'>;

// ... existing code ...

// ... existing code ...

// Helper type to get an entity's attributes with their proper types
type EntityAttributes<
	Schema extends IContainEntitiesAndLinks<EntitiesDef, any>,
	T extends keyof Schema['entities'],
> = InstaQLEntity<Schema, T>;

// Helper type to determine if a link is "many" or "one"
type LinkCardinality<
	Schema extends IContainEntitiesAndLinks<EntitiesDef, any>,
	T extends keyof Schema['entities'],
	K extends keyof Schema['entities'][T]['links'],
> = Schema['entities'][T]['links'][K]['has'] extends 'many'
	? InstaQLEntity<Schema, Schema['entities'][T]['links'][K]['on']>[]
	: InstaQLEntity<Schema, Schema['entities'][T]['links'][K]['on']>;

// Helper type to create a nested query structure for links
// Helper type to create a nested query structure for specific links
type LinkQuery<
	Schema extends IContainEntitiesAndLinks<EntitiesDef, any>,
	T extends keyof Schema['entities'],
	Links extends keyof Schema['entities'][T]['links'] = never,
> = Record<Links, {}>;

// Updated helper type to get an entity with specific links
export type EntityWithLinks<
	Schema extends IContainEntitiesAndLinks<EntitiesDef, any>,
	T extends keyof Schema['entities'],
	Links extends keyof Schema['entities'][T]['links'] = never,
> = InstaQLEntity<
	Schema,
	T,
	LinkQuery<Schema, T, Links>
>;

// Test the type with specific links
type ItemWithOwnerOnly = EntityWithLinks<AppSchema, 'items', 'owner'>;
type ItemWithRoomOnly = EntityWithLinks<AppSchema, 'items', 'room'>;
type ItemWithBothLinks = EntityWithLinks<AppSchema, 'items', 'owner' | 'room'>;

// Example usage (these are just for type checking)
const test1: ItemWithOwnerOnly = {}; // Will only include owner relation
const test2: ItemWithRoomOnly = {}; // Will only include room relation
const test3: ItemWithBothLinks = {}; // Will include both relations

export function createEntityQuery<
	T extends keyof AppSchema['entities'],
	Links extends keyof AppSchema['entities'][T]['links'] = never,
>(
	entityName: T,
	...relations: Links[]
): LinkQuery<AppSchema, T, Links> {
	return Object.fromEntries(
		relations.map(relation => [relation, {}]),
	) as LinkQuery<AppSchema, T, Links>;
}
export function withLinks<
	T extends keyof AppSchema['entities'],
	Links extends readonly (keyof AppSchema['entities'][T]['links'])[],
>(
	entityName: T,
	relations: [...Links],
): EntityWithLinks<
		AppSchema,
		T,
		Links[number]
	> {
	return {
		...createEntityQuery(entityName, ...relations),
	} as any;
}

// Example usage with improved type inference:
const itemWithLinks = withLinks('items', ['owner', 'room']);
// Type is EntityWithLinks<AppSchema, 'items', 'owner' | 'room'>

const personWithLinks = withLinks('persons', ['room', 'items']);
// Type is EntityWithLinks<AppSchema, 'persons', 'room'>
