import { InstaQLEntity, InstaQLParams } from '@instantdb/react';
import { Pagination, SegmentedControl, Space, TextInput } from '@mantine/core';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import schema, { AppSchema } from '~client/db/instant.schema';
import List from '~client/lib/list/list';
import { ListHeader } from '~client/lib/list/list-header';
import { OutletWrapper } from '~client/lib/outlet-wrapper';
import { getIDBSearchQuery, validateSearch } from '~client/lib/utils';
import { db } from '~client/main';
import PersonForm from '~client/routes/people/-form';
import { IDBList, useIDBPagination } from '~instantdb-react-ui/index';

export const Route = createFileRoute('/people')({
	component: PersonList,
	validateSearch,
});

type ListMode = 'normal' | 'infinite' | 'paginated';

function PersonList() {
	const params = Route.useParams() as { id?: string };
	const search = Route.useSearch();
	const navigate = Route.useNavigate();

	// List people in alphabetical order with search filtering
	const personQuery = {
		persons: { $: {
			order: { name: 'asc' },
			where: { name: { $ilike: getIDBSearchQuery(search) } },
		} },
	} satisfies InstaQLParams<AppSchema>;

	// Pagination
	const pagination = useIDBPagination({
		schema: schema,
		db: db,
		model: 'persons',
		pageSize: 10,
		query: personQuery,
	});

	// Reset pagination when search changes
	useEffect(() => {
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
				<ListHeader title="People" createTitle="Create person" modalContent={PersonForm} />

				{/* Search Input */}
				<TextInput
					placeholder="Search"
					value={search.search || ''}
					onChange={e => navigate({ search: { search: e.target.value } })}
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
					<>
						{/* Wrapper Version */}
						<List
							schema={schema}
							db={db}
							mode="normal"
							entity="persons"
							query={personQuery}
							route="/people/$id"
							itemId={params.id}
							search={search}
							render={(person, id) => (
								<p className="text-sm">{person.name}</p>
							)}
						/>

						{/* Normal Version */}
						{/* <IDBList
							mode="normal"
							schema={schema}
							db={db}
							entity="persons"
							render={(person, id) => (
								<p className="text-sm">{person.name}</p>
							)}
						/> */}
					</>
				)}

				{/* List - Infinite */}
				{listMode === 'infinite' && (
					<>
						{/* Wrapper Version */}
						<List
							schema={schema}
							db={db}
							entity="persons"
							mode="infinite"
							pageSize={10}
							query={personQuery}
							route="/people/$id"
							itemId={params.id}
							search={search}
							render={person => (
								<p className="text-sm">{person.name}</p>
							)}
						/>

						{/* Normal Version */}
						{/* <IDBList
							mode="infinite"
							schema={schema}
							db={db}
							entity="persons"
							render={(person, id) => (
								<p className="text-sm">{person.name}</p>
							)}
						/> */}
					</>
				)}

				{/* List - Paginated */}
				{listMode === 'paginated' && (
					<>
						{/* Wrapper Version */}
						<List
							schema={schema}
							db={db}
							entity="persons"
							mode="paginated"
							pagination={pagination}
							route="/people/$id"
							itemId={params.id}
							search={search}
							render={person => (
								<p className="text-sm">{person.name}</p>
							)}
						/>

						{/* Normal Version */}
						{/* <IDBList
							mode="paginated"
							pagination={pagination}
							schema={schema}
							db={db}
							entity="persons"
							render={(person, id) => (
								<p className="text-sm">{person.name}</p>
							)}
						/> */}

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
