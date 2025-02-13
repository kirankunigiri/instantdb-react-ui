/* eslint-disable @typescript-eslint/no-explicit-any */

import { ReactNode, useEffect, useRef, useState } from 'react';

import { useIDBReactUIProvider } from '../utils/provider';

interface BaseListProps<T> {
	render: (item: T, id: string | number) => ReactNode
	skeleton?: ReactNode
	noResults?: ReactNode
}

type NormalListProps<T> = BaseListProps<T> & {
	mode?: 'normal'
	entity: string
	query?: any
};

type InfiniteListProps<T> = BaseListProps<T> & {
	mode: 'infinite'
	entity: string
	query?: any
	pageSize?: number
};

type PaginatedListProps<T> = BaseListProps<T> & {
	mode: 'paginated'
	pagination: PaginationState
};

export type IDBListProps<T> = NormalListProps<T> | InfiniteListProps<T> | PaginatedListProps<T>;

/** Standard list that loads all data at once */
const NormalList = <T extends Record<string, any>>(props: NormalListProps<T>) => {
	const { entity, render, skeleton, query, noResults } = props;

	const { db } = useIDBReactUIProvider();
	const constructedQuery = query || { [entity]: {} };
	const { isLoading, error, data: rawData } = db.useQuery(constructedQuery);

	// Extract the array from the entity property
	const data = rawData ? rawData[entity] as T[] : null;

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
const InfiniteList = <T extends Record<string, any>>(props: InfiniteListProps<T>) => {
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
	const items = rawData ? rawData[entity] as T[] : [];
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

interface PaginationOptions {
	query?: any
	model: string
	pageSize?: number
}

interface PaginationState extends PaginationOptions {
	items: any[]
	page: number
	totalPages: number
	totalItems: number
	goToPage: (page: number) => void
}

/** Hook to get pagination state for a paginated list */
export const useIDBPagination = (props: PaginationOptions): PaginationState => {
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
	};

	const { data: itemData } = db.useQuery(itemQuery);
	const items = itemData?.[props.model] || [];

	const goToPage = (newPage: number) => {
		setPage(Math.max(1, Math.min(newPage, totalPages)));
	};

	return {
		...props,
		items,
		page,
		totalPages,
		totalItems,
		goToPage,
	};
};

/** Paginated list */
const PaginatedList = <T extends Record<string, any>>(props: PaginatedListProps<T>) => {
	const { render, skeleton, noResults, pagination } = props;

	if (!pagination || !pagination.items) return skeleton || null;
	if (pagination.items.length === 0) return noResults || null;

	return (
		<>
			{pagination.items.map(item => (
				<div key={item.id}>
					{render(item, item.id)}
				</div>
			))}
		</>
	);
};

/** instantdb-react-ui list component, with support for normal, infinite, and paginated modes */
export const IDBList = <T extends Record<string, any>>(props: IDBListProps<T>) => {
	const { mode } = props;
	if (mode === 'infinite') {
		return <InfiniteList<T> {...props} />;
	} else if (mode === 'paginated') {
		return <PaginatedList<T> {...props} />;
	}

	// Default to normal list
	return <NormalList<T> {...props} />;
};
