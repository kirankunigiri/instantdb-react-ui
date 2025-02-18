/* eslint-disable @typescript-eslint/no-explicit-any */
import { IContainEntitiesAndLinks } from '@instantdb/core/dist/module/schemaTypes';
import { EntitiesDef, InstaQLEntity, InstaQLParams, InstaQLResult } from '@instantdb/react';

type LinkQuery<
	Schema extends IContainEntitiesAndLinks<EntitiesDef, any>,
	T extends keyof Schema['entities'],
> = {
	[K in keyof Schema['entities'][T]['links']]: {};
};

export type EntityWithLinks<
	Schema extends IContainEntitiesAndLinks<EntitiesDef, any>,
	T extends keyof Schema['entities'],
	Q extends InstaQLParams<Schema> | undefined = undefined,
> = Q extends InstaQLParams<Schema>
	? NonNullable<InstaQLResult<Schema, Q>[T]> extends (infer Item)[]
		? Item
		: InstaQLResult<Schema, Q>[T]
	: InstaQLEntity<Schema, T, LinkQuery<Schema, T>>;

export interface EntityForm<
	Schema extends IContainEntitiesAndLinks<EntitiesDef, any>,
	T extends keyof Schema['entities'],
	Q extends InstaQLParams<Schema> | undefined = undefined,
> {
	Field: <K extends keyof EntityWithLinks<Schema, T, Q>>(props: {
		name: K
		children: (field: {
			name: K
			state: {
				value: EntityWithLinks<Schema, T, Q>[K]
			}
			handleBlur: () => void
			handleChange: (value: EntityWithLinks<Schema, T, Q>[K]) => void
		}) => React.ReactElement
	}) => React.ReactElement
	handleSubmit: () => void
}

export function useEntityForm<
	Schema extends IContainEntitiesAndLinks<EntitiesDef, any>,
	T extends keyof Schema['entities'],
	Q extends InstaQLParams<Schema> | undefined = undefined,
>(
	schema: Schema,
	entity: T,
	options?: {
		defaultValues?: Partial<EntityWithLinks<Schema, T, Q>>
		query?: Q
	},
): EntityForm<Schema, T, Q> {
	return {
		Field: ({ name, children }) => {
			// Now TypeScript knows the exact type for each field
			const value = options?.defaultValues?.[name] as EntityWithLinks<Schema, T, Q>[typeof name];
			return children({
				name,
				state: { value },
				handleBlur: () => {},
				handleChange: (value: EntityWithLinks<Schema, T, Q>[typeof name]) => {},
			});
		},
		handleSubmit: () => {},
	};
}
