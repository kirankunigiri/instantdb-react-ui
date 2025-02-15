import { InstaQLEntity } from '@instantdb/react';
import { TextInput } from '@mantine/core';
import { createFileRoute } from '@tanstack/react-router';

import { AppSchema } from '~client/db/instant.schema';
import List from '~client/lib/list/list';
import { ListHeader } from '~client/lib/list/list-header';
import { OutletWrapper } from '~client/lib/outlet-wrapper';
import { entityNames } from '~client/main';
import ItemForm from '~client/routes/items/-form';

type Item = InstaQLEntity<AppSchema, 'items'>;

export const Route = createFileRoute('/items')({
	component: ItemList,
});

function ItemList() {
	const params = Route.useParams() as { id?: number };

	return (
		<div className="page">

			{/* List View */}
			<div className="left-list">
				{/* Header */}
				<ListHeader title="Items" entity={entityNames.items} modalContent={ItemForm} />

				{/* Search Input */}
				<TextInput
					placeholder="Search"
					// value={search.search || ''}
					// onChange={e => navigate({ search: { search: e.target.value } })}
					className="mb-4"
				/>

				{/* List */}
				<List<Item>
					route="/items/$id"
					entity={entityNames.items}
					itemId={params.id}
					// Render
					render={item => (
						<>
							<p className="text-sm">{item.name}</p>
							<p className="text-sm text-gray-500"> {item.category}</p>
						</>
					)}
				/>
			</div>

			{/* Detail View */}
			<OutletWrapper route={Route} />
		</div>
	);
}
