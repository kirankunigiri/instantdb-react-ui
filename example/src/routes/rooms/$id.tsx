import { Divider } from '@mantine/core';
import { createFileRoute } from '@tanstack/react-router';

import { DetailHeader } from '~client/lib/detail-header';
import RoomForm from '~client/routes/rooms/-form';

export const Route = createFileRoute('/rooms/$id')({
	component: RoomDetail,
});

function RoomDetail() {
	const params = Route.useParams() as { id: string };

	return (
		<div className="flex grow flex-col justify-between">
			<div>
				<DetailHeader entity="rooms" id={params.id} route="/rooms" />
				<RoomForm type="update" />
			</div>

		</div>
	);
}
