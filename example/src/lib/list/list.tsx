import { ScrollArea } from '@mantine/core';
import { Skeleton } from '@mantine/core';
import { Link } from '@tanstack/react-router';

import type { RouteFullPaths } from '~client/lib/sidebar';
import type { SearchParams } from '~client/lib/utils';
import { IDBEntityType, IDBQueryType, IDBSchemaType } from '~instantdb-react-ui/form/use-idb-form';
import { IDBList, IDBListProps } from '~instantdb-react-ui/list/list';

// Extend IDBListProps with our custom wrapper props
type ListWrapperProps<
	TSchema extends IDBSchemaType,
	TEntity extends IDBEntityType<TSchema>,
	TQuery extends IDBQueryType<TSchema>,
> = IDBListProps<TSchema, TEntity, TQuery> & {
	route: RouteFullPaths
	itemId?: string
	search?: SearchParams
};

// Use the same generic parameters as IDBList
export function List<
	TSchema extends IDBSchemaType,
	TEntity extends IDBEntityType<TSchema>,
	TQuery extends IDBQueryType<TSchema>,
>({ itemId, search, route, ...idbListProps }: ListWrapperProps<TSchema, TEntity, TQuery>) {
	return (
		<ScrollArea className="list-scrollarea">
			<IDBList<TSchema, TEntity, TQuery>
				{...idbListProps}

				// Defaults
				skeleton={idbListProps.skeleton ?? <ListSkeleton />}
				noResults={idbListProps.noResults ?? <p className="text-gray-500">No results found</p>}

				// Render
				render={(item, id) => (
					<Link
						key={id}
						to={route}
						params={{ id: id.toString() }}
						className="list-item"
						data-selected={id === itemId}
						search={search}
					>
						{idbListProps.render(item, id)}
					</Link>
				)}
			/>
		</ScrollArea>
	);
}

/** Skeleton loading UI for the list */
function ListSkeleton() {
	return (
		<>
			{Array.from({ length: 10 }).map((_, i: number) => (
				<Skeleton key={i} height={42} className="list-item" />
			))}
		</>
	);
}

export default List;
