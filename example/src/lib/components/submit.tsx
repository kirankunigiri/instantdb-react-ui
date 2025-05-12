import { Button, Space } from '@mantine/core';
import { FormApi, useForm } from '@tanstack/react-form';

import { IDBFormType } from '~instantdb-react-ui/index';

interface SubmitButtonProps {
	type: IDBFormType
	form: ReturnType<typeof useForm>
}

function SubmitButton(props: SubmitButtonProps) {
	if (props.type === 'update') return null;

	return (
		<props.form.Subscribe
			selector={state => [state.canSubmit, state.isSubmitting, state.isPristine]}
			children={([canSubmit, isSubmitting, isPristine]) => (
				<>
					<Space h="xs" />
					<div className="flex justify-end">
						<Button disabled={!canSubmit || isPristine} onClick={() => props.form.handleSubmit()} loading={isSubmitting}>
							Submit
						</Button>
					</div>
				</>
			)}
		/>
	);
}

export default SubmitButton;
