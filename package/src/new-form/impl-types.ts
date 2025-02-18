import { formOptions, useForm as tanstackUseForm } from '@tanstack/react-form';

import type { ReactFormExtendedApi, useForm as UseFormType } from './types';

export function useCustomForm<TFormData>(
	opts?: Parameters<typeof UseFormType<TFormData>>[0],
): ReactFormExtendedApi<TFormData, undefined> {
	return tanstackUseForm<TFormData, undefined>(opts);
}
