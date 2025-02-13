/* eslint-disable @typescript-eslint/no-explicit-any */
import type { DataAttrDef, ValueTypes } from '@instantdb/core';
import { i } from '@instantdb/core';
import { z } from 'zod';

// TODO: move to package folder
// TODO: potential simpler solution is to create a wrapper function around i.string, etc. that returns the extended type
// TODO: let zod-gen.ts run as a cli command (bunx instantdb-zod-generator --schema ./src/db/instant.schema.ts)

type ZodTypeAny = z.ZodType<any>;

class ExtendedDataAttrDef<ValueType, IsRequired extends boolean> implements DataAttrDef<ValueType, IsRequired> {
	constructor(
		public valueType: ValueTypes,
		public required: IsRequired,
		public config: {
			indexed: boolean
			unique: boolean
		} = { indexed: false, unique: false },
		public _zodTransform?: () => ZodTypeAny,
	) {}

	// Add type guard method
	isRequired(): this is ExtendedDataAttrDef<ValueType, true> {
		return this.required;
	}

	withZod(zodTransform: () => ZodTypeAny): ExtendedDataAttrDef<ValueType, IsRequired> {
		return new ExtendedDataAttrDef<ValueType, IsRequired>(
			this.valueType,
			this.required,
			this.config,
			zodTransform,
		);
	}

	optional(): ExtendedDataAttrDef<ValueType, false> {
		return new ExtendedDataAttrDef<ValueType, false>(
			this.valueType,
			false,
			this.config,
			this._zodTransform,
		);
	}

	unique() {
		return new ExtendedDataAttrDef<ValueType, IsRequired>(
			this.valueType,
			this.required,
			{ ...this.config, unique: true },
			this._zodTransform,
		);
	}

	indexed() {
		return new ExtendedDataAttrDef<ValueType, IsRequired>(
			this.valueType,
			this.required,
			{ ...this.config, indexed: true },
			this._zodTransform,
		);
	}
}

class ExtendedEntityDef<
	Attrs extends Record<string, DataAttrDef<any, any>>,
	Links extends Record<string, any>,
	AsType = void,
> {
	constructor(
		public attrs: Attrs,
		public links: Links,
	) {}

	asType<_AsType extends Partial<MappedAttrs<Attrs>>>() {
		return new ExtendedEntityDef<Attrs, Links, _AsType>(this.attrs, this.links);
	}
}

// Update the extended object with proper type parameters
const extended = {
	...i,
	string: () => new ExtendedDataAttrDef<string, true>('string', true),
	number: () => new ExtendedDataAttrDef<number, true>('number', true),
	date: () => new ExtendedDataAttrDef<Date, true>('date', true),
	boolean: () => new ExtendedDataAttrDef<boolean, true>('boolean', true),
	json: () => new ExtendedDataAttrDef<any, true>('json', true),
	entity: <Attrs extends Record<string, DataAttrDef<any, any>>>(attrs: Attrs) =>
		new ExtendedEntityDef(attrs, {}),
};

// Update MappedAttrs type to properly resolve the value types
type MappedAttrs<Attrs> = {
	[K in RequiredKeys<Attrs>]: Attrs[K] extends ExtendedDataAttrDef<infer V, true> ? V : never;
} & {
	[K in OptionalKeys<Attrs>]?: Attrs[K] extends ExtendedDataAttrDef<infer V, false> ? V : never;
};

type RequiredKeys<Attrs> = {
	[K in keyof Attrs]: Attrs[K] extends DataAttrDef<any, infer R>
		? R extends true
			? K
			: never
		: never;
}[keyof Attrs];

type OptionalKeys<Attrs> = {
	[K in keyof Attrs]: Attrs[K] extends DataAttrDef<any, infer R>
		? R extends false
			? K
			: never
		: never;
}[keyof Attrs];

// Add these type definitions before the export
type ResolveEntityAttrs<
	EDef extends ExtendedEntityDef<any, any, any>,
	ResolvedAttrs = MappedAttrs<EDef['attrs']>,
> = EDef extends ExtendedEntityDef<any, any, infer AsType>
	? AsType extends void
		? ResolvedAttrs
		: Omit<ResolvedAttrs, keyof AsType> & AsType
	: ResolvedAttrs;

// Update ExtendedInstaQLEntity to directly use MappedAttrs
type ExtendedInstaQLEntity<
	Schema extends { entities: Record<string, ExtendedEntityDef<any, any, any>> },
	EntityName extends keyof Schema['entities'],
	Subquery = {},
> = {
	id: string
} & MappedAttrs<Schema['entities'][EntityName]['attrs']>;

// Export the type along with the extended i
export { extended as i };
export type { ExtendedInstaQLEntity, ResolveEntityAttrs };
