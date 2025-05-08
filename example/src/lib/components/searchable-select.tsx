import { Combobox, type ComboboxStore, Input, InputBase, ScrollArea, useCombobox } from '@mantine/core';
import { useEffect, useState } from 'react';
import { LuCircleCheck, LuSearch } from 'react-icons/lu';

/**
 * SearchableSelect - a better version of the Mantine Select component
 * This component borrows the design of the shadcn select component
 * - Supports numbers for values
 * - Uses seaparate search input in dropdown
 * - Automatically changes active element when scrolling (just like shadcn)
 */

type BaseValue = number | string;

interface SelectValue {
	label: string
	value: BaseValue
}

export interface SearchableSelectProps {
	data: SelectValue[]
	value?: BaseValue | null
	onChange?: (value: BaseValue | null) => void
	onBlur?: () => void
	onFocus?: () => void
	error?: string | null
	defaultValue?: BaseValue | null
	placeholder?: string
	searchPlaceholder?: string
	label?: string
	description?: string
	className?: string
	disabled?: boolean
	required?: boolean
}

const selectDropdownTransition = {
	in: { opacity: 1, transform: 'scale(1)' },
	out: { opacity: 0, transform: 'scale(0.95)' },
	common: { transformOrigin: 'top' },
	transitionProperty: 'transform, opacity',
};

function SearchableSelectOption({ item, selectedValue, combobox, index }: { item: SelectValue, selectedValue: BaseValue | null, combobox: ComboboxStore, index: number }) {
	// Use mouseMove instead of mouseEnter to avoid resetting the selection when arrow keys are used
	const handleMouseMove = () => {
		combobox.selectOption(index);
	};

	return (
		<Combobox.Option value={item.label} key={item.value} active={item.value === selectedValue} className="flex w-full items-center" onMouseMove={handleMouseMove}>
			<div className="flex w-6 items-center">
				{item.value === selectedValue && <LuCircleCheck size={16} />}
			</div>
			{item.label}
		</Combobox.Option>
	);
}

export function SearchableSelect(props: SearchableSelectProps) {
	const combobox = useCombobox({
		onDropdownClose: () => {
			combobox.resetSelectedOption();
			combobox.focusTarget();
		},
		onDropdownOpen: () => {
			setSearch('');
			combobox.selectFirstOption();
			combobox.focusSearchInput();
		},
	});

	const [search, setSearch] = useState('');
	const [internalValue, setInternalValue] = useState<BaseValue | null>(props.defaultValue ?? null);

	const value = props.value !== undefined ? props.value : internalValue;
	const selectedItem = props.data.find(item => item.value === value);
	const selectedLabel = selectedItem?.label || '';

	// Filter options based on search
	const filteredOptions = props.data.filter(item =>
		item.label.toLowerCase().includes(search.toLowerCase().trim()),
	);

	useEffect(() => {
		combobox.selectFirstOption();
	}, [search]);

	const options = filteredOptions.map((item, index) => (
		<SearchableSelectOption key={item.value} item={item} selectedValue={value} combobox={combobox} index={index} />
	));

	const inputPlaceholder = props.placeholder || 'Select...';

	return (
		<Combobox
			styles={{
				search: {
					width: '100%',
					borderBottom: '1px solid var(--bd-light)',
					backgroundColor: 'var(--mantine-body)',
					height: '40px',
				},
			}}
			transitionProps={{ transition: selectDropdownTransition, duration: 100 }}
			store={combobox}
			withinPortal={true}
			onOptionSubmit={(label) => {
				const selected = props.data.find(item => item.label === label);
				const newValue = selected?.value ?? null;
				if (props.value !== undefined) {
					props.onChange?.(newValue);
				} else {
					setInternalValue(newValue);
					props.onChange?.(newValue);
				}
				combobox.closeDropdown();
			}}
		>
			<Combobox.Target>
				<InputBase
					error={props.error}
					required={props.required}
					label={props.label}
					description={props.description}
					className={`mantine-Select-wrapper ${props.className || ''}`}
					component="button"
					type="button"
					pointer
					disabled={props.disabled}
					rightSection={<Combobox.Chevron />}
					onClick={() => !props.disabled && combobox.toggleDropdown()}
					onFocus={props.onFocus}
					onBlur={props.onBlur}
					rightSectionPointerEvents="none"
				>
					{selectedLabel || <Input.Placeholder>{inputPlaceholder}</Input.Placeholder>}
				</InputBase>
			</Combobox.Target>

			<Combobox.Dropdown>
				<Combobox.Search
					leftSection={<LuSearch size={14} />}
					variant="unstyled"
					value={search}
					onChange={event => setSearch(event.currentTarget.value)}
					placeholder="Search..."
				/>
				<Combobox.Options>
					<ScrollArea.Autosize type="scroll" mah={200}>
						{options.length > 0 ? options : <Combobox.Empty className="text-left">Nothing found</Combobox.Empty>}
					</ScrollArea.Autosize>
				</Combobox.Options>
			</Combobox.Dropdown>
		</Combobox>
	);
}
