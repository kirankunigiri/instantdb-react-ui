import { createFileRoute } from '@tanstack/react-router';

import { DetailHeader } from '~client/lib/detail-header';
import PersonForm from '~client/routes/people/-form';

export const Route = createFileRoute('/people/$id')({
	component: PersonDetail,
});

function PersonDetail() {
	const params = Route.useParams() as { id: string };

	return (
		<div className="flex grow flex-col justify-between">
			<div>
				<DetailHeader entity="persons" id={params.id} route="/people" />
				<PersonForm type="update" />
			</div>

			{/* <ItemsDetailCode /> */}
		</div>
	);
}
