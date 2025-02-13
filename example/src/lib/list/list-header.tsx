import { ActionIcon, Button, Modal, Space } from '@mantine/core';
import { useDisclosure, useHotkeys } from '@mantine/hooks';
import { LuPlus } from 'react-icons/lu';

import { ReusableFormComponentProps } from '~client/lib/components/components';
import { useIDBFormState } from '~instantdb-react-ui/utils/utils';

export function ListHeader({
	title,
	entity,
	modalContent: ModalContent,
}: {
	title: string
	entity: string
	modalContent: React.ComponentType<ReusableFormComponentProps>
}) {
	useHotkeys([
		['meta+m', () => openCreateModal()],
	]);

	const [
		createModalOpened,
		{ open: openCreateModal, close: closeCreateModal },
	] = useDisclosure(false);

	// Use form state to update button disabled state
	const { formRef, formState, handleFormChange } = useIDBFormState();

	return (
		<>
			{/* Create Modal */}
			<Modal opened={createModalOpened} onClose={closeCreateModal} title={`Create ${entity}`}>
				<ModalContent type="create" formRef={formRef} onFormChange={handleFormChange}>
					<Space h="md" />
					<div className="flex justify-end">
						<Button disabled={!formState?.isValid()} type="submit" onClick={closeCreateModal}>Create {entity.slice(0, -1)}</Button>
					</div>
				</ModalContent>
			</Modal>

			{/* List Header */}
			<div className="mb-2 mt-3 flex items-center justify-between font-semibold">
				<p className="text-lg font-semibold">{title}</p>
				<ActionIcon size="sm" variant="light" onClick={openCreateModal}>
					<LuPlus size={12} />
				</ActionIcon>
			</div>
		</>
	);
}
