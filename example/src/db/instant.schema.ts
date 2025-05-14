import { i } from '@instantdb/react';
import { z } from 'zod';

// TODO: import from package causes an error where schema:push fails when parsing field.tsx
// TODO: this can be fixed by asking instant team or always importing directly from utils folder
import { addZod, makeLinkRequired } from '../../../package/src/utils/utils';

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
				z.string().min(1, { message: 'Please enter a name' })),
			email: addZod(i.string().unique().indexed(),
				z.string().email({ message: 'Please enter a valid email address' }).min(5).max(100)),
		}),
		items: i.entity({
			name: addZod(i.string().unique().indexed(),
				z.string().min(1, { message: 'Please enter a name' })),
			shareable: addZod(i.boolean(),
				z.boolean().default(true)),
			category: addZod(i.string(),
				z.nativeEnum(ITEM_CATEGORY)),
			date: addZod(i.date().indexed(),
				z.number().max(new Date().setHours(23, 59, 59, 999)).default(Date.now)),
		}),
		rooms: i.entity({
			name: addZod(i.string().indexed(),
				z.string().min(1, { message: 'Please enter a name' })),
			description: addZod(i.string(),
				z.string().min(1, { message: 'Please enter a description' })),
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
makeLinkRequired(_schema.entities.items.links.room, 'Please select a room');
makeLinkRequired(_schema.entities.persons.links.room, 'Please select a room');

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
