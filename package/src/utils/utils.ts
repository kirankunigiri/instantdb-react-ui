import { useCallback } from 'react';
import { useState } from 'react';
import { useRef } from 'react';

import { IDBFormState } from '../form/form';

/** This hook will automatically re-render your parent component when the IDBForm state changes */
export const useIDBFormState = () => {
	const formRef = useRef<IDBFormState>(null);
	const [formState, setFormState] = useState<IDBFormState>(null);

	// useCallback will avoid unnecessary re-renders when passing handleFormChange to IDBForm
	const handleFormChange = useCallback(() => {
		if (formRef.current) setFormState(formRef.current);
	}, [formRef]);

	return { formRef, formState, handleFormChange };
};
