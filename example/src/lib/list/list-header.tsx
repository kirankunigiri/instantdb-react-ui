import { ActionIcon, Modal } from '@mantine/core';
import { useDisclosure, useHotkeys } from '@mantine/hooks';
import { LuPlus } from 'react-icons/lu';

import { ReusableFormComponentProps2 } from '~client/lib/components/components';

export function ListHeader({
	title,
	createTitle,
	modalContent: ModalContent,
}: {
	title: string
	createTitle: string
	modalContent: React.ComponentType<ReusableFormComponentProps2>
}) {
	useHotkeys([
		['meta+m', () => openCreateModal()],
	]);

	const [
		createModalOpened,
		{ open: openCreateModal, close: closeCreateModal },
	] = useDisclosure(false);

	return (
		<>
			{/* Create Modal */}
			<Modal opened={createModalOpened} onClose={closeCreateModal} title={createTitle}>
				<ModalContent type="create" onValidSubmit={closeCreateModal} />
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
