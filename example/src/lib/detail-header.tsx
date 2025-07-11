import { ActionIcon, Button, Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { LuTrash } from 'react-icons/lu';

import { AppSchema } from '~client/db/instant.schema';
import type { RouteFullPaths } from '~client/lib/sidebar';
import { db } from '~client/main';

interface DetailHeaderProps {
	entity: keyof AppSchema['entities']
	route: RouteFullPaths
	id: number | string
}

export function DetailHeader(props: DetailHeaderProps) {
	// Modal state
	const [deleteModalOpened, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	// Delete handler
	const handleDelete = async () => {
		setLoading(true);
		try {
			navigate({ to: props.route });
			await db.transact(db.tx[props.entity][props.id]!.delete());
		} finally {
			setLoading(false);
			closeDeleteModal();
		}
	};

	return (
		<>

			{/* Detail Header */}
			<div className="mb-2 flex w-full justify-between gap-2">
				<p className="text-lg font-semibold capitalize">{props.entity.slice(0, -1)} Details</p>
				<ActionIcon color="red" size="sm" variant="light" onClick={openDeleteModal}>
					<LuTrash size={12} />
				</ActionIcon>
			</div>

			{/* Delete Modal */}
			<Modal opened={deleteModalOpened} onClose={closeDeleteModal} title={`Delete ${props.entity}`}>
				<p>Are you sure you want to delete this {props.entity.toLowerCase().slice(0, -1)}?</p>
				<div className="mt-4 flex justify-end gap-4">
					<Button variant="default" onClick={closeDeleteModal}>Cancel</Button>
					<Button variant="filled" color="red" loading={loading} onClick={handleDelete}>Delete</Button>
				</div>
			</Modal>
		</>
	);
}
