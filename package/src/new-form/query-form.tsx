/* eslint-disable @typescript-eslint/no-explicit-any */
import { IContainEntitiesAndLinks } from '@instantdb/core/dist/module/schemaTypes';
import { EntitiesDef, InstaQLEntity, InstaQLParams, InstaQLResult } from '@instantdb/react';
import { formOptions, useForm } from '@tanstack/react-form';

export interface EntityForm<
	Schema extends IContainEntitiesAndLinks<EntitiesDef, any>,
	T extends keyof Schema['entities'],
	Q extends InstaQLParams<Schema>,
> {
	Field: <K extends keyof (NonNullable<InstaQLResult<Schema, Q>[T]> extends (infer U)[] ? U : never)>(props: {
		name: K
		children: (field: {
			name: K
			state: {
				value: (NonNullable<InstaQLResult<Schema, Q>[T]> extends (infer U)[] ? U : never)[K]
			}
		}) => React.ReactElement
	}) => React.ReactElement
}

export function useEntityForm<
	Schema extends IContainEntitiesAndLinks<EntitiesDef, any>,
	T extends keyof Schema['entities'],
	Q extends InstaQLParams<Schema>,
>(
	schema: Schema,
	entity: T,
	options: {
		defaultValues?: Partial<NonNullable<InstaQLResult<Schema, Q>[T]> extends (infer U)[] ? U : never>
		query: Q
	},
): EntityForm<Schema, T, Q> {
	return {
		Field: ({ name, children }) => {
			const value = options?.defaultValues?.[name] as (NonNullable<InstaQLResult<Schema, Q>[T]> extends (infer U)[] ? U : never)[typeof name];
			return children({
				name,
				state: { value },
			});
		},
	};
}
