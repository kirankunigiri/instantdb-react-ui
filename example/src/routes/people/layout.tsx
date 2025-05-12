import { InstaQLEntity, InstaQLParams } from '@instantdb/react';
import { Pagination, ScrollArea, SegmentedControl, Space, TextInput } from '@mantine/core';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import schema, { AppSchema } from '~client/db/instant.schema';
import List from '~client/lib/list/list';
import { ListHeader } from '~client/lib/list/list-header';
import { OutletWrapper } from '~client/lib/outlet-wrapper';
import { entityNames, type IDBQuery } from '~client/main';
import PersonForm from '~client/routes/people/-form';
import { IDBList, useIDBPagination } from '~instantdb-react-ui/index';

type Person = InstaQLEntity<AppSchema, 'persons'>;

export const Route = createFileRoute('/people')({
	component: PersonList,
});

type ListMode = 'normal' | 'infinite' | 'paginated';

function PersonList() {
	const params = Route.useParams() as { id?: string };

	// List people in alphabetical order
	const personQuery = {
		persons: { $: {
			order: { name: 'asc' },
			// where: {
			// 	name: { $like: 'Bernice' },
			// },
		} },
	} satisfies InstaQLParams<AppSchema>;

	// Pagination
	const pagination = useIDBPagination({
		schema: schema,
		model: 'persons',
		pageSize: 10,
		query: personQuery,
	});

	// TODO: add search
	useEffect(() => {
		// Reset pagination when search changes
		pagination.goToPage(1);
	}, []);

	// List Mode Controller
	const modes: ListMode[] = ['normal', 'infinite', 'paginated'] as const;
	const [listMode, setListMode] = useState<ListMode>('normal');

	return (
		<div className="page">

			{/* List View */}
			<div className="left-list">
				{/* Header */}
				<ListHeader title="People" entity={entityNames.persons} modalContent={PersonForm} />

				{/* Search Input */}
				<TextInput
					placeholder="Search"
					// value={search.search || ''}
					// onChange={e => navigate({ search: { search: e.target.value } })}
				/>
				<Space h="sm" />

				<SegmentedControl
					className="w-full capitalize"
					value={listMode}
					onChange={value => setListMode(value as ListMode)}
					withItemsBorders={false}
					data={modes.map(mode => ({ label: mode, value: mode }))}
				/>

				<Space h="sm" />

				{/* All list types */}
				{/* List - Normal */}
				{listMode === 'normal' && (
					<List
						schema={schema}
						mode="normal"
						entity="persons"
						query={personQuery}
						route="/people/$id"
						itemId={params.id}
						render={(person, id) => (
							<p className="text-sm">{person.name}</p>
						)}
					/>
				)}

				{/* List - Infinite */}
				{listMode === 'infinite' && (
					<List
						schema={schema}
						entity="persons"
						mode="infinite"
						pageSize={10}
						query={personQuery}
						route="/people/$id"
						itemId={params.id}
						// search={search}
						render={person => (
							<p className="text-sm">{person.name}</p>
						)}
					/>
				)}

				{/* List - Paginated */}
				{listMode === 'paginated' && (
					<>
						<List
							schema={schema}
							entity="persons"
							mode="paginated"
							pagination={pagination}
							route="/people/$id"
							itemId={params.id}
							// search={search}
							render={person => (
								<p className="text-sm">{person.name}</p>
							)}
						/>
						<div className="items-center justify-center py-2">
							<Pagination
								siblings={1}
								withEdges
								boundaries={1}
								value={pagination.page}
								total={pagination.totalPages}
								onChange={page => pagination.goToPage(page)}
							/>
						</div>
					</>
				)}
			</div>

			{/* Detail View */}
			<OutletWrapper route={Route} />
		</div>
	);
}
