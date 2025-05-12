import { createFileRoute } from '@tanstack/react-router';

import { DetailHeader } from '~client/lib/detail-header';
import ItemForm2 from '~client/routes/items/-form2';

export const Route = createFileRoute('/items/$id')({
	component: ItemDetail,
});

function ItemDetail() {
	const params = Route.useParams() as { id: string };

	return (
		<div className="flex grow flex-col justify-between">
			<div>
				<DetailHeader entity="items" id={params.id} route="/items" />
				<ItemForm2 type="update" />
			</div>
		</div>
	);
}
