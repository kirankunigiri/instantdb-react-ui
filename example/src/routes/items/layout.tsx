import { InstaQLParams } from '@instantdb/react';
import { Space, TextInput } from '@mantine/core';
import { createFileRoute } from '@tanstack/react-router';

import schema, { AppSchema } from '~client/db/instant.schema';
import List from '~client/lib/list/list';
import { ListHeader } from '~client/lib/list/list-header';
import { OutletWrapper } from '~client/lib/outlet-wrapper';
import { getIdbSearchQueryForField, validateSearch } from '~client/lib/utils';
import ItemForm2 from '~client/routes/items/-form2';

export const Route = createFileRoute('/items')({
	component: ItemList,
	validateSearch,
});

function ItemList() {
	const params = Route.useParams() as { id?: string };
	const search = Route.useSearch();
	const navigate = Route.useNavigate();

	const itemsQuery = {
		items: {
			$: {
				// order: { name: 'desc' }, // TODO: Can't use order until instantdb bug is resolved
				where: getIdbSearchQueryForField(search, 'name'),
			},
		},
	} satisfies InstaQLParams<AppSchema>;

	// const itemsWithoutOrder = db.useQuery({
	// 	items: { },
	// });

	// const itemsWithOrder = db.useQuery({
	// 	items: { $: { order: { name: 'asc' } } },
	// });

	// // 5 items
	// console.log(`Normal Items Length: ${itemsWithoutOrder.data?.items.length}`);
	// console.log(`Normal Items List: ${itemsWithoutOrder.data?.items.map(item => item.name)}`);
	// // 3 items
	// console.log(`Ordered Items Length: ${itemsWithOrder.data?.items.length}`);
	// console.log(`Normal Items List: ${itemsWithOrder.data?.items.map(item => item.name)}`);

	return (
		<div className="page">

			{/* List View */}
			<div className="left-list">

				{/* Header */}
				<ListHeader title="Items" createTitle="Create Item" modalContent={ItemForm2} />

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
					entity="items"
					query={itemsQuery}
					route="/items/$id"
					itemId={params.id}
					search={search}
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
