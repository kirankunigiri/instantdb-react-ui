import { InstaQLParams } from '@instantdb/react';
import { Space, TextInput } from '@mantine/core';
import { createFileRoute } from '@tanstack/react-router';

import schema, { AppSchema } from '~client/db/instant.schema';
import List from '~client/lib/list/list';
import { ListHeader } from '~client/lib/list/list-header';
import { OutletWrapper } from '~client/lib/outlet-wrapper';
import { getIdbSearchQueryForField, validateSearch } from '~client/lib/utils';
import { db } from '~client/main';
import RoomForm from '~client/routes/rooms/-form';

export const Route = createFileRoute('/rooms')({
	component: RoomsList,
	validateSearch,
});

function RoomsList() {
	const params = Route.useParams() as { id?: string };
	const search = Route.useSearch();
	const navigate = Route.useNavigate();

	const roomsQuery = {
		rooms: {
			$: {
				where: getIdbSearchQueryForField(search, 'name'),
			},
		},
	} satisfies InstaQLParams<AppSchema>;

	return (
		<div className="page">

			{/* List View */}
			<div className="left-list">

				{/* Header */}
				<ListHeader title="Rooms" createTitle="Create Room" modalContent={RoomForm} />

				{/* Search Input */}
				<TextInput
					placeholder="Search"
					value={search.search || ''}
					onChange={e => navigate({ search: { search: e.target.value } })}
				/>
				<Space h="sm" />

				{/* List */}
				<List
					schema={schema}
					db={db}
					entity="rooms"
					query={roomsQuery}
					route="/rooms/$id"
					itemId={params.id}
					search={search}
					render={item => (
						<p className="text-sm">{item.name}</p>
					)}
				/>
			</div>

			{/* Detail View */}
			<OutletWrapper route={Route} />
		</div>
	);
}
