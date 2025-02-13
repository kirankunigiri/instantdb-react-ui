import { Checkbox, CheckboxProps } from '@mantine/core';
import { DateTimePicker, DateTimePickerProps } from '@mantine/dates';
import { ReactNode } from 'react';

import { IDBFormProps } from '~instantdb-react-ui/form/form';

// Checkbox Wrapper to allow boolean values
interface CheckboxWrapperProps extends Omit<CheckboxProps, 'value'> {
	value?: boolean
}
export function CheckboxWrapper({ value, ...props }: CheckboxWrapperProps) {
	return <Checkbox label="Shareable" checked={value} {...props} />;
}

// Date Input Wrapper to allow numerical values
interface DateInputWrapperProps extends Omit<DateTimePickerProps, 'value' | 'onChange'> {
	value?: number
	onChange?: (value: number) => void
}
export function DateInputWrapper({ value, onChange, ...props }: DateInputWrapperProps) {
	const handleChange = (date: Date | null) => {
		if (!date) return;
		if (onChange) onChange(date.getTime());
	};

	return (
		<DateTimePicker
			label="Date"
			value={value ? new Date(value) : null}
			onChange={handleChange}
			valueFormat="MM/DD/YYYY hh:mm A"
			{...props}
		/>
	);
}

// Reusable form component props (used by list-header)
export type ReusableFormComponentProps = Omit<IDBFormProps, 'id' | 'entity' | 'fields' | 'children'> & {
	children?: ReactNode
};
