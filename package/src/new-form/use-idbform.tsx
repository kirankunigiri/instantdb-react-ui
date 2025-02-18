/* eslint-disable @typescript-eslint/no-explicit-any */
import { IContainEntitiesAndLinks } from '@instantdb/core/dist/module/schemaTypes';
import { EntitiesDef, InstaQLParams, InstaQLResult } from '@instantdb/react';
import { FieldApi, FieldMeta, FieldState, formOptions, useForm } from '@tanstack/react-form';
import { ReactNode, useCallback, useEffect, useRef } from 'react';

import { useNewReactContext } from '../utils/provider';

export function useIDBForm<
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
) {
	type FormData = NonNullable<InstaQLResult<Schema, Q>[T]> extends (infer U)[] ? U : never;
	const formOpts = formOptions<FormData>({
		defaultValues: options.defaultValues as FormData,
	});

	// const useMyForm: typeof useForm = useTanstackForm;

	const form = useForm({
		...formOpts,
		// adapter: zodResolver(schema),
	});

	const { db } = useNewReactContext();
	const links = schema.entities[entity as string].links;

	useEffect(() => {
		db.subscribeQuery(options.query, (resp) => {
			if (resp.error) {
				console.error(resp.error.message);
				return;
			}
			if (resp.data) {
				const item = (resp.data[entity] as any)?.[0];
				console.log(item);

				for (const [fieldName, fieldValue] of Object.entries(item)) {
					let newValue: any = fieldValue;
					const prevValue = form.getFieldValue(fieldName);

					// For relations, use the id as value. When unlinking, the value is undefined
					const link = links[fieldName];
					if (link) {
						if (newValue) {
							if (link.cardinality === 'many') {
								newValue = newValue.map((item: any) => item.id);
							} else {
								newValue = newValue.id;
							}
						} else {
							newValue = '';
						}
					}

					// Update the form if the value has changed
					if (JSON.stringify(prevValue) !== JSON.stringify(newValue)) {
						console.log('setting field value', fieldName, newValue);
						form.setFieldValue(fieldName, newValue);
					}
					if (!(form.getFieldMeta(fieldName))?.synced) {
						console.log('setting synced to true', fieldName);
						form.setFieldMeta(fieldName, prevMeta => ({ ...prevMeta, synced: true }));
					}
				}
			}
		});
	}, []);

	// TODO: this is just temporary. later, use an actual debounce library that will run after the user stops typing for a certain amount of time
	const timeoutRef = useRef<NodeJS.Timeout>();
	const debouncedTransact = useCallback((callback: () => void) => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		timeoutRef.current = setTimeout(() => {
			callback();
		}, 500);
	}, []);

	const customOnChange = (field: FieldApi<any, any>, value: any) => {
		console.log('customOnChange', field, value);
		const id = form.getFieldValue('id');
		console.log('settings sync to false');

		form.setFieldMeta(field.name, prevMeta => ({ ...prevMeta, synced: false }));
		debouncedTransact(() => {
			db.transact(db.tx[entity][id]!.update({ [field.name]: value }));
		});
	};

	// This makes state undefined
	const OriginalField = form.Field;
	const WrappedField = (props: any) => (
		<OriginalField
			{...props}
			children={(field: FieldApi<any, any>) => {
				const originalHandleChange = field.handleChange;

				// Object.defineProperty(field, 'handleChange', {
				// 	configurable: true,
				// 	enumerable: true,
				// 	writable: true,
				// 	value: (e: any) => {
				// 		originalHandleChange(e); // Call the original function first
				// 		customOnChange(field, e); // Then call your custom function
				// 	},
				// });

				field.handleChangeUpdate = (e: any) => {
					field.handleChange(e);
					customOnChange(field, e);
				};

				field.idbMeta = field.state.meta;

				return props.children(field);
			}}
		/>
	);
	WrappedField.displayName = 'WrappedField';
	form.Field = WrappedField;

	// const TestField = ({ name, children }: { name: string, children: (field: FieldApi<any, any>) => ReactNode }) => (
	// 	<form.Field
	// 		name={name}
	// 		children={field => (
	// 			<>
	// 				<p>{JSON.stringify(field.state.meta)}</p>
	// 			</>
	// 		)}
	// 	/>
	// );

	// type FormField = FieldApi<any, any> & {
	// 	state: FieldApi<any, any>['state'] & {
	// 		meta: FieldApi<any, any>['state']['meta'] & CustomFieldMeta
	// 	}
	// 	test: string
	// 	customMeta: CustomFieldMeta
	// };

	// type FormType = typeof form & {
	// 	Field: (props: {
	// 		test: string
	// 		name: string
	// 		children: (field: FormField) => ReactNode
	// 	}) => ReactNode
	// };

	//   type FormField = FieldApi<any, any>;

	//   type FormType = typeof form & {
	//   	Field: (props: {
	//   		test: string
	//   		name: string
	//   		children: (field: FormField) => ReactNode
	//   	}) => ReactNode
	//   };

	// type FormField<TData> = FieldApi<TData, any> & {
	// 	handleChangeUpdate: (e: any) => void
	// 	state: Omit<FieldApi<TData, any>['state'], 'meta'> & {
	// 		meta: CustomFieldMeta
	// 	}
	// };

	// type FormType = Omit<typeof form, 'Field'> & {
	// 	Field: <TName extends keyof FormData>(props: {
	// 		name: TName
	// 		children: (field: FormField<FormData>) => ReactNode
	// 	}) => ReactNode
	// };
	return form;
	// return form as unknown as FormType;
}

export interface CustomFieldMeta {
	synced: boolean
}

declare module '@tanstack/react-form' {
	interface FieldApi<TData, TName extends string | number | symbol = string> {
		/** This is a custom function that is used to update the field value */
		handleChangeUpdate: (e: any) => void
		idbMeta: CustomFieldMeta
	}
}
