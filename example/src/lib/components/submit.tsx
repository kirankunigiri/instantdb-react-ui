import { Button, Space } from '@mantine/core';
import { FormApi, ReactFormApi, ReactFormExtendedApi } from '@tanstack/react-form';

import { IDBExtractFormType } from '~instantdb-react-ui/index';
import { IDBFormType } from '~instantdb-react-ui/new-form/use-idb-form2';

interface SubmitButtonProps {
	type: IDBFormType

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	form: ReactFormExtendedApi<any, any, any, any, any, any, any, any, any, any>
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
