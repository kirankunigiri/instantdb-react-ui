import { Checkbox, Combobox, ScrollArea, Textarea } from '@mantine/core';
import { Button, Modal, Select, Tooltip } from '@mantine/core';
import { createTheme } from '@mantine/core';

// Custom animations
const selectDropdownTransition = {
	in: { opacity: 1, transform: 'scale(1)' },
	out: { opacity: 0, transform: 'scale(0.95)' },
	common: { transformOrigin: 'top' },
	transitionProperty: 'transform, opacity',
};

// Theme config
export const theme = createTheme({
	cursorType: 'pointer', // adds pointer cursor for checkbox
	focusClassName: 'focus-auto',
	components: {
		Button: Button.extend({
			defaultProps: {
				variant: 'primary',
				radius: '6px',
				size: 'xs',
				autoContrast: true,
			},
		}),
		Textarea: Textarea.extend({
			defaultProps: {
				styles: {
					input: {
						fontSize: '14px',
					},
				},
			},
		}),
		Combobox: Combobox.extend({
			defaultProps: {
				offset: 4,
				shadow: 'md',
			},
		}),
		Select: Select.extend({
			defaultProps: {
				comboboxProps: {
					transitionProps: { transition: selectDropdownTransition, duration: 100 },
				},
				allowDeselect: false,
			},
		}),
		Tooltip: Tooltip.extend({
			defaultProps: {
				radius: '6px',
				withArrow: true,
				openDelay: 300,
				transitionProps: { transition: 'pop', duration: 100 },
			},
		}),
		TooltipGroup: Tooltip.Group.extend({
			defaultProps: {
				openDelay: 300,
				closeDelay: 100,
			},
		}),
		Modal: Modal.extend({
			defaultProps: {
				returnFocus: false,
				centered: true,
				transitionProps: { transition: 'pop', duration: 150 },
			},
		}),
		ScrollArea: ScrollArea.extend({
			defaultProps: {
				scrollbarSize: 8,
			},
		}),
		Checkbox: Checkbox.extend({
			defaultProps: {
				color: 'var(--btn-default)',
				iconColor: 'var(--btn-reverse)',
				size: 'xs',
				radius: '4px',
				styles: {
					input: {
						borderColor: 'var(--btn-default)',
					},
				},
			},
		}),
	},
});
