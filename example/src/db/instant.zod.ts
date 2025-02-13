import { z } from 'zod';

import { ITEM_CATEGORY } from '~client/db/instant.schema';

export const personsSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string().email().min(5).max(100),
});

export const itemsSchema = z.object({
	id: z.string(),
	name: z.string(),
	shareable: z.string(),
	category: z.nativeEnum(ITEM_CATEGORY),
	date: z.date().min(new Date('2020-01-01')),
});

export const houseRoomsSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	testDefaultValue: z.string(),
	aiSummary: z.string(),
});
