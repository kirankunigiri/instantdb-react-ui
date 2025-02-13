/* eslint-disable @typescript-eslint/no-explicit-any */
import { InstantReactWebDatabase, InstantSchemaDef } from '@instantdb/react';
import { createContext, useContext } from 'react';

export interface IDBReactUIConfig {
	db: InstantReactWebDatabase<InstantSchemaDef<any, any, any>>
	schema: InstantSchemaDef<any, any, any>
}

const IDBReactUIContext = createContext<IDBReactUIConfig | null>(null);

export function useIDBReactUIProvider() {
	const context = useContext(IDBReactUIContext);
	if (!context) {
		throw new Error('instantdb-ui components must be used within an IDBReactUIProvider');
	}
	return context;
}

interface IDBReactUIProviderProps extends IDBReactUIConfig {
	children: React.ReactNode
}

export function IDBReactUIProvider({ db, schema, children }: IDBReactUIProviderProps) {
	return (
		<IDBReactUIContext.Provider value={{ db, schema }}>
			{children}
		</IDBReactUIContext.Provider>
	);
}
