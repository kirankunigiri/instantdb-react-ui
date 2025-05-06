/* eslint-disable @typescript-eslint/no-explicit-any */
import { ScrollArea } from '@mantine/core';
import { Skeleton } from '@mantine/core';
import { Link } from '@tanstack/react-router';

import type { RouteFullPaths } from '~client/lib/sidebar';
import type { SearchParams } from '~client/lib/utils';
import { IDBList, type IDBListProps } from '~instantdb-react-ui/list/list';

type ListWrapperProps<T> = IDBListProps<T> & {
	route: RouteFullPaths
	itemId?: string
	search?: SearchParams
};

function List<T extends Record<string, any>>({ itemId, search, route, ...idbListProps }: ListWrapperProps<T>) {
	return (
		<ScrollArea className="list-scrollarea">
			<IDBList<T>
				{...idbListProps}

				// Defaults
				skeleton={idbListProps.skeleton ?? <ListSkeleton />}
				noResults={idbListProps.noResults ?? <p className="text-gray-500">No results found</p>}

				// Render
				render={(item: T, id: string) => (
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
