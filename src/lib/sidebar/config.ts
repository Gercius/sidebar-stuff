import type { LevelConfig, SidebarItem } from './types';

/**
 * Per-level configuration. This array is the nesting extension point:
 * add an entry to allow deeper nesting — `MAX_DEPTH` follows automatically.
 */
export const levels: LevelConfig[] = [
	{ indent: 0, fontSize: 15, fontWeight: 600, canHaveChildren: true },
	{ indent: 16, fontSize: 14, fontWeight: 500, canHaveChildren: true },
	{ indent: 32, fontSize: 13, fontWeight: 400, canHaveChildren: true },
	{ indent: 48, fontSize: 12, fontWeight: 400, canHaveChildren: false }
];

/** Maximum nesting depth, derived from {@link levels}. */
export const MAX_DEPTH = levels.length;

/**
 * Sample tree used as the default document: top-level links plus nested
 * sublinks, including one branch that reaches `MAX_DEPTH`.
 * Returns fresh objects on every call so callers never share state.
 */
export function createSampleTree(): SidebarItem[] {
	return [
		{ id: 'dashboard', label: 'Dashboard', icon: '📊', href: '/', children: [] },
		{
			id: 'projects',
			label: 'Projects',
			icon: '📁',
			href: '/projects',
			children: [
				{
					id: 'projects-apollo',
					label: 'Apollo',
					icon: '🚀',
					href: '/projects/apollo',
					children: []
				},
				{
					id: 'projects-sidebar-builder',
					label: 'Sidebar Builder',
					icon: '🧩',
					href: '/projects/sidebar-builder',
					children: [
						{ id: 'projects-sidebar-builder-design', label: 'Design', children: [] },
						{
							id: 'projects-sidebar-builder-code',
							label: 'Implementation',
							children: [
								{ id: 'projects-sidebar-builder-code-store', label: 'Store', children: [] }
							]
						}
					]
				}
			]
		},
		{
			id: 'reports',
			label: 'Reports',
			icon: '📈',
			children: [
				{ id: 'reports-weekly', label: 'Weekly', href: '/reports/weekly', children: [] },
				{
					id: 'reports-monthly',
					label: 'Monthly',
					href: '/reports/monthly',
					children: [
						{ id: 'reports-monthly-q1', label: 'Q1', children: [] },
						{ id: 'reports-monthly-q2', label: 'Q2', children: [] }
					]
				}
			]
		},
		{
			id: 'settings',
			label: 'Settings',
			icon: '⚙️',
			href: '/settings',
			children: [
				{ id: 'settings-profile', label: 'Profile', href: '/settings/profile', children: [] },
				{
					id: 'settings-notifications',
					label: 'Notifications',
					href: '/settings/notifications',
					children: []
				}
			]
		}
	];
}
