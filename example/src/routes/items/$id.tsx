import { createFileRoute } from '@tanstack/react-router';

import { DetailHeader } from '~client/lib/detail-header';
import { entityNames } from '~client/main';
import ItemForm from '~client/routes/items/-form';

export const Route = createFileRoute('/items/$id')({
	component: ItemDetail,
});

function ItemDetail() {
	const params = Route.useParams() as { id: string };

	return (
		<div className="flex grow flex-col justify-between">
			<div>
				<DetailHeader model={entityNames.items} id={params.id} route="/items" />
				<ItemForm type="update" />
			</div>

			{/* <ItemsDetailCode /> */}
		</div>
	);
}
