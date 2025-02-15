import { useForm, zodResolver } from '@mantine/form';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { DetailHeader } from '~client/lib/detail-header';
import { entityNames } from '~client/main';
import PersonForm from '~client/routes/people/-form';

export const Route = createFileRoute('/people/$id')({
	component: PersonDetail,
});

function PersonDetail() {
	const params = Route.useParams() as { id: string };

	const zodSchema = z.object({
		name: z.string(),
		email: z.string().email(),
	});

	const form = useForm({
		mode: 'controlled',
		validateInputOnChange: true,
		initialValues: {
			name: 'test',
			email: 'test@test.com',
		},
		validate: zodResolver(zodSchema),
	});

	console.dir(form.isValid());

	return (
		<div className="flex grow flex-col justify-between">
			<div>
				<DetailHeader model={entityNames.persons} id={params.id} route="/people" />
				<PersonForm type="update" />
			</div>

			{/* <ItemsDetailCode /> */}
		</div>
	);
}
