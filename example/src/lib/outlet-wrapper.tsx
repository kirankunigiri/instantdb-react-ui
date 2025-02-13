import { Modal } from '@mantine/core';
import { type AnyRoute, Outlet } from '@tanstack/react-router';

import { useIsMobile } from '~client/lib/sidebar';

export function OutletWrapper({ route }: { route: AnyRoute }) {
	const params = route.useParams() as { id?: number };
	const id = params.id;
	const search = route.useSearch();
	const navigate = route.useNavigate();
	const isMobile = useIsMobile();

	return (
		<>

			{/* Desktop Detail View */}
			{!isMobile && (
				<div className="right-detail overflow-y-scroll">
					{id ? <Outlet /> : <p>Select an item to view details</p>}
				</div>
			)}

			{/* Mobile Modal */}
			{isMobile && (
				<Modal fullScreen={true} opened={!!id} onClose={() => navigate({ to: route.fullPath, search: search })}>
					<Outlet />
				</Modal>
			)}
		</>
	);
}
