import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '~client/index.css';
import '~client/styles/button.css';
import '~client/styles/form.css';
import '~client/styles/input.css';
import '~client/styles/modal.css';
import '~client/styles/tooltip.css';

import { init } from '@instantdb/react';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { theme } from 'example/src/styles/mantine-theme';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import schema from '~client/db/instant.schema';
import { routeTree } from '~client/routeTree.gen';
import { IDBReactUIProvider } from '~instantdb-react-ui/index';

// --------------------------------------------------------------------------------
// InstantDB Setup
export const db = init({
	appId: import.meta.env.VITE_INSTANT_APP_ID,
	schema: schema,
});
export type IDBQuery = Parameters<typeof db.useQuery>[0];

// --------------------------------------------------------------------------------
// TanStack Router Setup
const router = createRouter({ routeTree });
declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}

createRoot(document.getElementById('root')!).render(
	<StrictMode>

		<MantineProvider theme={theme} defaultColorScheme="dark">
			<IDBReactUIProvider db={db} schema={schema}>
				<ModalsProvider>
					<RouterProvider router={router} />
				</ModalsProvider>
			</IDBReactUIProvider>
		</MantineProvider>

	</StrictMode>,
);
