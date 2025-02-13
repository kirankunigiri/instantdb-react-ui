import { useMantineColorScheme } from '@mantine/core';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Toaster } from 'sonner';

import Sidebar from '~client/lib/sidebar';

export const Route = createRootRoute({
	component: () => (
		<>
			<Sidebar>
				<Outlet />
			</Sidebar>
			<CustomSonner />
		</>
	),
});

const CustomSonner = () => {
	const { colorScheme } = useMantineColorScheme();
	const sonnerScheme: 'light' | 'dark' | 'system' = colorScheme === 'auto' ? 'system' : colorScheme;
	return <Toaster richColors theme={sonnerScheme} />;
};

export default Route;
