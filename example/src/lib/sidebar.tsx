import { AppShell, Box, Burger, Button, Divider, Group, Space, Tooltip, useMantineColorScheme } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import type { FileRoutesByPath } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { type IconType } from 'react-icons';
import { LuDoorOpen, LuExternalLink, LuInfo, LuMoon, LuSun, LuUsers } from 'react-icons/lu';
import { MdOutlineCategory } from 'react-icons/md';

import { routeTree } from '~client/routeTree.gen';

type RouteKeys = keyof FileRoutesByPath;
export type RouteFullPaths = FileRoutesByPath[RouteKeys]['fullPath'];

interface SidebarItem {
	fullPath: RouteFullPaths
	icon: IconType
}

type RouteGroup = Record<string, SidebarItem[]>;

export const organizedRoutes: RouteGroup = {
	Tables: [
		{ fullPath: '/items', icon: MdOutlineCategory },
		{ fullPath: '/people', icon: LuUsers },
		{ fullPath: '/rooms', icon: LuDoorOpen },
	],
	Info: [
		{ fullPath: '/about', icon: LuInfo },
	],
} as const;

export const sidebarLinks = [
	{
		title: 'GitHub',
		link: 'https://github.com/kirankunigiri/instantdb-react-ui',
		icon: LuExternalLink,
	},
	{
		title: 'Docs',
		link: 'https://github.com/kirankunigiri/instantdb-react-ui/', // TODO: add docs link
		icon: LuExternalLink,
	},
];

const devtoolButtonProps = {
	px: 0,
	size: 'sm',
	color: 'gray',
	variant: 'light',
	styles: { label: { color: 'var(--mantine-color-gray-light-color)' } },
} as const;

const SIDEBAR_PADDING = 'px-2';
const SIDEBAR_HEADER_HEIGHT = 42;
const SIDEBAR_TITLE = 'instantdb-react-ui';
const LOGO_TRANSITION = 'transition-transform duration-200 ease-in-out hover:scale-[1.2]';

export function useIsMobile() {
	return useMediaQuery('(max-width: 48em)');
}

function LogoHeader() {
	return (
		<>
			<div className="m-2 mx-7 flex cursor-default select-none items-center justify-center gap-2 rounded-md bg-[#282828] px-2 py-1 shadow-md">
				<Tooltip.Group openDelay={0}>

					{/* InstantDB Logo */}
					<Tooltip openDelay={0} label="InstantDB">
						<img
							src="https://www.instantdb.com/img/icon/logo-512.svg"
							alt="InstantDB Logo"
							className={`max-h-4 max-w-4 ${LOGO_TRANSITION}`}
						/>
					</Tooltip>
					<code className="text-sm font-bold text-white/80">+</code>

					{/* React Logo */}
					<Tooltip openDelay={0} label="React">
						<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/1180px-React-icon.svg.png" alt="React Logo" className={`max-h-[1.1rem] max-w-[1.1rem] ${LOGO_TRANSITION}`} />
					</Tooltip>
					<code className="text-sm font-bold text-white/80">+</code>

					{/* Zod Logo */}
					<Tooltip openDelay={0} label="Zod">
						<img src="https://zod.dev/logo.svg" alt="Zod Logo" className={`max-h-5 max-w-5 ${LOGO_TRANSITION}`} />
					</Tooltip>
				</Tooltip.Group>
			</div>
			<div className="flex w-full flex-col items-center justify-center">
				<code className="w-full text-center text-sm font-bold">{SIDEBAR_TITLE}</code>
				<code className="w-full text-center text-xs font-bold">(demo site)</code>
			</div>
			<Space h="xs" />
			<Divider className="border-bd-strong"></Divider>
		</>
	);
}

function LogoHeaderV2() {
	return (
		<>
			<div className="m-4 mb-0 flex w-[120px] items-center gap-2 rounded-md bg-[#282828] p-2 py-1 shadow-md">
				<Tooltip.Group openDelay={0}>

					{/* InstantDB Logo */}
					<Tooltip openDelay={0} label="InstantDB">
						<img
							src="https://www.instantdb.com/img/icon/logo-512.svg"
							alt="InstantDB Logo"
							className={`max-h-4 max-w-4 ${LOGO_TRANSITION}`}
						/>
					</Tooltip>
					<code className="text-sm font-bold text-white/80">+</code>

					{/* React Logo */}
					<Tooltip openDelay={0} label="React">
						<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/1180px-React-icon.svg.png" alt="React Logo" className={`max-h-4 max-w-4 ${LOGO_TRANSITION}`} />
					</Tooltip>
					<code className="text-sm font-bold text-white/80">+</code>

					{/* Zod Logo */}
					<Tooltip openDelay={0} label="Zod">
						<img src="https://zod.dev/logo.svg" alt="Zod Logo" className={`max-h-5 max-w-5 ${LOGO_TRANSITION}`} />
					</Tooltip>
				</Tooltip.Group>
			</div>

			<div className="m-2 mt-0 flex cursor-default select-none gap-2 p-2">
				<div className="flex w-full flex-col">
					<code className="w-full text-sm font-bold">{SIDEBAR_TITLE}</code>
					<code className="w-full text-xs font-bold">(demo site)</code>
				</div>
			</div>
			<Divider className="border-bd-strong" />
		</>
	);
}

function LogoHeaderV3() {
	return (
		<>
			{/* bg-[#282828] */}
			<div className="m-2 flex cursor-default select-none flex-col gap-2 rounded-md p-2">

				<div className="flex w-full flex-col items-center justify-center">
					<code className="w-full text-sm font-bold">{SIDEBAR_TITLE}</code>
					<code className="w-full text-xs font-bold">(demo site)</code>
				</div>

				<div className="flex hidden items-center gap-2">
					<Tooltip.Group openDelay={0}>

						{/* InstantDB Logo */}
						<Tooltip openDelay={0} label="InstantDB">
							<img
								src="https://www.instantdb.com/img/icon/logo-512.svg"
								alt="InstantDB Logo"
								className={`max-h-4 max-w-4 ${LOGO_TRANSITION}`}
							/>
						</Tooltip>
						<code className="text-sm font-bold text-white/80">+</code>

						{/* React Logo */}
						<Tooltip openDelay={0} label="React">
							<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/1180px-React-icon.svg.png" alt="React Logo" className={`max-h-4 max-w-4 ${LOGO_TRANSITION}`} />
						</Tooltip>
						<code className="text-sm font-bold text-white/80">+</code>

						{/* Zod Logo */}
						<Tooltip openDelay={0} label="Zod">
							<img src="https://zod.dev/logo.svg" alt="Zod Logo" className={`max-h-5 max-w-5 ${LOGO_TRANSITION}`} />
						</Tooltip>
					</Tooltip.Group>
				</div>
			</div>
			<Divider className="border-bd-strong"></Divider>
		</>
	);
}

export function Sidebar({ children }: { children: React.ReactNode }) {
	const [opened, { toggle }] = useDisclosure();
	const isMobile = useIsMobile();
	const { toggleColorScheme } = useMantineColorScheme();
	const { colorScheme } = useMantineColorScheme();
	if (!routeTree.children) return null;

	return (
		<AppShell
			header={{ height: isMobile ? SIDEBAR_HEADER_HEIGHT : 0 }}
			navbar={{ width: 200, breakpoint: 'sm', collapsed: { mobile: !opened } }}
		>
			<AppShell.Header withBorder={isMobile ? true : false}>
				<Group h="100%" px="md" className="bg-sidebar-bg" hidden={!isMobile}>
					<Burger opened={opened} onClick={toggle} size="sm" />
					<p className="text-lg font-bold">{SIDEBAR_TITLE}</p>
				</Group>
			</AppShell.Header>
			<AppShell.Navbar withBorder={false}>

				{/* Sidebar */}
				<div className="flex grow flex-col gap-2 border-r border-solid border-bd-strong bg-sidebar-bg text-sm">

					{/* Header */}
					<div hidden={isMobile} className="">
						{/* TODO: Compare logo card to normal text only */}
						{/* <LogoHeader /> */}
						{/* <LogoHeaderV2 /> */}
						<LogoHeaderV3 />
					</div>

					{/* Links */}
					<div className={`mt-2 flex flex-col gap-5 ${SIDEBAR_PADDING}`}>

						{/* Routes */}
						{Object.entries(organizedRoutes).map(([groupTitle, routes]) => (
							<div key={groupTitle} className="flex flex-col gap-1">
								<p className="sidebar-group-title ml-2 text-xs text-gray-500">
									{groupTitle}
								</p>

								{/* Sidebar Route Links */}
								{routes.map(route => (
									<Link
										key={route.fullPath}
										to={route.fullPath}
										onClick={() => opened && toggle()}
										className="sidebar-link"
									>
										<route.icon />
										<span>{route.fullPath.replaceAll('/', '')}</span>
									</Link>
								))}

								{/* External Links - under the Info group */}
								{groupTitle === 'Info' && (
									sidebarLinks.map(link => (
										<a
											key={link.link}
											href={link.link}
											onClick={() => opened && toggle()}
											target="_blank"
											rel="noreferrer"
											className="sidebar-link"
										>
											<link.icon size={14} />
											<span>{link.title}</span>
										</a>
									))
								)}
							</div>
						))}
					</div>

					{/* Spacer */}
					<div className="grow"></div>

					<div className="mx-2 flex items-center justify-center gap-2 rounded-md bg-[#282828] py-2 shadow-md">
						<Tooltip.Group openDelay={0}>

							{/* InstantDB Logo */}
							<Tooltip openDelay={0} label="InstantDB">
								<img
									src="https://www.instantdb.com/img/icon/logo-512.svg"
									alt="InstantDB Logo"
									className={`max-h-5 max-w-5 ${LOGO_TRANSITION}`}
								/>
							</Tooltip>
							<code className="text-sm font-bold text-white/80">+</code>

							{/* React Logo */}
							<Tooltip openDelay={0} label="React">
								<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/1180px-React-icon.svg.png" alt="React Logo" className={`max-h-5 max-w-5 ${LOGO_TRANSITION}`} />
							</Tooltip>
							<code className="text-sm font-bold text-white/80">+</code>

							{/* Tanstack Logo */}
							<Tooltip openDelay={0} label="Tanstack Form">
								<img src="https://avatars.githubusercontent.com/u/72518640?s=200&v=4" alt="Tanstack Logo" className={`max-h-6 max-w-6 rounded-full ${LOGO_TRANSITION}`} />
							</Tooltip>
							<code className="text-sm font-bold text-white/80">+</code>

							{/* Zod Logo */}
							<Tooltip openDelay={0} label="Zod">
								<img src="https://zod.dev/logo.svg" alt="Zod Logo" className={`max-h-6 max-w-6 ${LOGO_TRANSITION}`} />
							</Tooltip>

						</Tooltip.Group>
					</div>

					{/* DevTools */}
					<Tooltip.Group>
						<Group grow gap={6} mb="xs" className={SIDEBAR_PADDING}>
							<Tooltip label="Toggle Theme">
								<Button {...devtoolButtonProps} onClick={toggleColorScheme}>
									{colorScheme === 'dark' ? <LuMoon size={22} /> : <LuSun size={22} />}
								</Button>
							</Tooltip>
						</Group>
					</Tooltip.Group>
				</div>
			</AppShell.Navbar>
			<AppShell.Main>
				<Box className="flex w-full" h={isMobile ? `calc(100dvh - ${SIDEBAR_HEADER_HEIGHT}px)` : '100dvh'}>
					{children}
				</Box>
			</AppShell.Main>
		</AppShell>
	);
}

export default Sidebar;
