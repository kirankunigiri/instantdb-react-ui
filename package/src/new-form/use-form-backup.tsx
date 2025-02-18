/* eslint-disable @typescript-eslint/no-explicit-any */
import { IContainEntitiesAndLinks } from '@instantdb/core/dist/module/schemaTypes';
import { EntitiesDef, InstaQLEntity } from '@instantdb/react';

type LinkQuery<
	Schema extends IContainEntitiesAndLinks<EntitiesDef, any>,
	T extends keyof Schema['entities'],
> = {
	[K in keyof Schema['entities'][T]['links']]: {};
};

export type EntityWithLinks<
	Schema extends IContainEntitiesAndLinks<EntitiesDef, any>,
	T extends keyof Schema['entities'],
> = InstaQLEntity<
	Schema,
	T,
	LinkQuery<Schema, T>
>;

export interface EntityForm<
	Schema extends IContainEntitiesAndLinks<EntitiesDef, any>,
	T extends keyof Schema['entities'],
> {
	Field: <K extends keyof EntityWithLinks<Schema, T>>(props: {
		name: K
		children: (field: {
			name: K
			state: {
				value: EntityWithLinks<Schema, T>[K]
			}
			handleBlur: () => void
			handleChange: (value: EntityWithLinks<Schema, T>[K]) => void
		}) => React.ReactElement
	}) => React.ReactElement
	handleSubmit: () => void
}

export function useEntityForm<
	Schema extends IContainEntitiesAndLinks<EntitiesDef, any>,
	T extends keyof Schema['entities'],
>(
	schema: Schema,
	entity: T,
	options?: {
		defaultValues?: Partial<EntityWithLinks<Schema, T>>
	},
): EntityForm<Schema, T> {
	return {
		Field: ({ name, children }) => {
			// Now TypeScript knows the exact type for each field
			const value = options?.defaultValues?.[name] as EntityWithLinks<Schema, T>[typeof name];
			return children({
				name,
				state: { value },
				handleBlur: () => {},
				handleChange: (value: EntityWithLinks<Schema, T>[typeof name]) => {},
			});
		},
		handleSubmit: () => {},
	};
}
