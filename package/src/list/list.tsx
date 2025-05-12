/* eslint-disable @typescript-eslint/no-explicit-any */

import { EntitiesDef, InstantSchemaDef, InstaQLParams, InstaQLResult, LinksDef } from '@instantdb/react';
import { ReactNode, useEffect, useRef, useState } from 'react';

import { ExtractIDBEntityType, IDBEntityType, IDBQueryType, IDBSchemaType, InstantValue } from '../new-form/use-idb-form2';
import { useIDBReactUIProvider } from '../utils/provider';

interface BaseListProps<
	TSchema extends IDBSchemaType,
	TEntity extends IDBEntityType<TSchema>,
	TQuery extends IDBQueryType<TSchema>,
> {
	schema: TSchema
	entity: TEntity
	query?: TQuery
	render: (item: ExtractIDBEntityType<TSchema, TEntity, TQuery>, id: string) => ReactNode
	skeleton?: ReactNode
	noResults?: ReactNode
}

type NormalListProps<
	TSchema extends IDBSchemaType,
	TEntity extends IDBEntityType<TSchema>,
	TQuery extends IDBQueryType<TSchema>,
> = BaseListProps<TSchema, TEntity, TQuery> & {
	mode?: 'normal'
};

type InfiniteListProps<
	TSchema extends IDBSchemaType,
	TEntity extends IDBEntityType<TSchema>,
	TQuery extends IDBQueryType<TSchema>,
> = BaseListProps<TSchema, TEntity, TQuery> & {
	mode: 'infinite'
	pageSize?: number
};

type PaginatedListProps<
	TSchema extends IDBSchemaType,
	TEntity extends IDBEntityType<TSchema>,
	TQuery extends IDBQueryType<TSchema>,
> = BaseListProps<TSchema, TEntity, TQuery> & {
	mode: 'paginated'
	pagination: PaginationState<TSchema, TEntity, TQuery>
};

export type IDBListProps<
	TSchema extends IDBSchemaType,
	TEntity extends IDBEntityType<TSchema>,
	TQuery extends IDBQueryType<TSchema>,
> = NormalListProps<TSchema, TEntity, TQuery> | InfiniteListProps<TSchema, TEntity, TQuery> | PaginatedListProps<TSchema, TEntity, TQuery>;

/** Standard list that loads all data at once */
const NormalList = <
	TSchema extends IDBSchemaType,
	TEntity extends IDBEntityType<TSchema>,
	TQuery extends IDBQueryType<TSchema>,
>(props: NormalListProps<TSchema, TEntity, TQuery>) => {
	const { entity, render, skeleton, query, noResults } = props;
	const { db } = useIDBReactUIProvider();

	const constructedQuery = query || { [entity]: {} };
	const { isLoading, error, data: rawData } = db.useQuery(constructedQuery); // TODO: Bug in Instant, isLoading doesn't change to false when the query changes

	// Extract the array from the entity property
	const data = rawData ? rawData[entity] as any[] : null;

	if (isLoading) return skeleton || null;
	if (error || !data) return noResults || null;
	if (data.length === 0) return noResults || null;

	return (
		<>
			{data.map(item => (
				<div key={item.id}>
					{render(item, item.id)}
				</div>
			))}
		</>
	);
};

/** Infinite list that loads more data when you scroll to the end of the list */
const InfiniteList = <
	TSchema extends IDBSchemaType,
	TEntity extends IDBEntityType<TSchema>,
	TQuery extends IDBQueryType<TSchema>,
>(props: InfiniteListProps<TSchema, TEntity, TQuery>) => {
	const { entity, render, skeleton, query, noResults, pageSize = 10 } = props;
	const { db } = useIDBReactUIProvider();
	const [limit, setLimit] = useState(pageSize);
	const loadMoreRef = useRef<HTMLDivElement>(null);

	const constructedQuery = {
		[entity]: {
			...(query?.[entity] || {}),
			$: {
				...(query?.[entity]?.$ || {}),
				limit,
			},
		},
	};

	const { isLoading, error, data: rawData } = db.useQuery(constructedQuery);
	const items = rawData ? rawData[entity] as any[] : [];
	const hasMore = items.length === limit;

	useEffect(() => {
		const increaseLimit = () => setLimit(prev => prev + pageSize);

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore) {
					increaseLimit();
				}
			},
			{ threshold: 0.1 },
		);

		const currentRef = loadMoreRef.current;
		if (currentRef) {
			observer.observe(currentRef);

			// Additional check to handle cases where intersection observer might miss
			const checkVisibility = () => {
				const entry = observer.takeRecords()[0];
				if (entry?.isIntersecting && hasMore) {
					increaseLimit();
				}
			};

			const timer = setInterval(checkVisibility, 100);

			return () => {
				observer.disconnect();
				clearInterval(timer);
			};
		}

		return () => observer.disconnect();
	}, [hasMore, pageSize]);

	if (isLoading && items.length === 0) return skeleton || null;
	if (error) return noResults || null;
	if (items.length === 0) return noResults || null;

	return (
		<>
			{items.map(item => (
				<div key={item.id}>
					{render(item, item.id)}
				</div>
			))}
			{isLoading && items.length > 0 && <div>Loading more...</div>}
			<div ref={loadMoreRef} style={{ height: '10px' }} />
		</>
	);
};

interface PaginationOptions<
	TSchema extends IDBSchemaType,
	TEntity extends IDBEntityType<TSchema>,
	TQuery extends IDBQueryType<TSchema>,
> {
	query?: TQuery
	model: TEntity
	pageSize?: number
	schema: TSchema
}

interface PaginationState<
	TSchema extends IDBSchemaType,
	TEntity extends IDBEntityType<TSchema>,
	TQuery extends IDBQueryType<TSchema>,
> extends PaginationOptions<TSchema, TEntity, TQuery> {
	items: ExtractIDBEntityType<TSchema, TEntity, TQuery>[]
	page: number
	totalPages: number
	totalItems: number
	goToPage: (page: number) => void
}

/** Hook to get pagination state for a paginated list */
export const useIDBPagination = <
	TSchema extends IDBSchemaType,
	TEntity extends IDBEntityType<TSchema>,
	TQuery extends IDBQueryType<TSchema>,
>(props: PaginationOptions<TSchema, TEntity, TQuery>): PaginationState<TSchema, TEntity, TQuery> => {
	const { db } = useIDBReactUIProvider();
	const pageSize = props.pageSize || 10;
	const [page, setPage] = useState(1);

	// Get all items to count total
	const allItemsQuery = props.query || { [props.model]: {} };
	const { data: allData } = db.useQuery(allItemsQuery);
	const totalItems = allData?.[props.model]?.length || 0;
	const totalPages = Math.ceil(totalItems / pageSize);

	// Get paginated items
	const itemQuery = {
		[props.model]: {
			...(props.query?.[props.model] || {}),
			$: {
				...(props.query?.[props.model]?.$ || {}),
				limit: pageSize,
				offset: (page - 1) * pageSize,
			},
		},
	} as TQuery;

	const { data: itemData } = db.useQuery(itemQuery);
	const items = itemData?.[props.model] || [];

	const goToPage = (newPage: number) => {
		setPage(Math.max(1, Math.min(newPage, totalPages)));
	};

	return {
		...props,
		items: items as ExtractIDBEntityType<TSchema, TEntity, TQuery>[],
		page,
		totalPages,
		totalItems,
		goToPage,
	};
};

/** Paginated list */
const PaginatedList = <
	TSchema extends IDBSchemaType,
	TEntity extends IDBEntityType<TSchema>,
	TQuery extends IDBQueryType<TSchema>,
>(props: PaginatedListProps<TSchema, TEntity, TQuery>) => {
	const { render, skeleton, noResults, pagination } = props;

	if (!pagination || !pagination.items) return skeleton || null;
	if (pagination.items.length === 0) return noResults || null;

	return (
		<>
			{pagination.items.map(item => (
				<div key={(item as InstantValue).id}>
					{render(item, (item as InstantValue).id)}
				</div>
			))}
		</>
	);
};

/** instantdb-react-ui list component, with support for normal, infinite, and paginated modes */
export const IDBList = <
	TSchema extends IDBSchemaType,
	TEntity extends IDBEntityType<TSchema>,
	TQuery extends IDBQueryType<TSchema>,
>(props: IDBListProps<TSchema, TEntity, TQuery>) => {
	const { mode } = props;
	if (mode === 'infinite') {
		return <InfiniteList {...props} />;
	} else if (mode === 'paginated') {
		return <PaginatedList {...props} />;
	}

	// Default to normal list
	return <NormalList {...props} />;
};
