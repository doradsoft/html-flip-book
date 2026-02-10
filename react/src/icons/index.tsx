/**
 * Icon components for the flipbook toolbar.
 * All icons use currentColor for stroke, making them themeable.
 */
import type React from "react";

interface IconProps {
	/** Icon size in pixels. Default: 24 */
	size?: number;
	/** Additional CSS class */
	className?: string;
}

const defaultProps: IconProps = { size: 24 };

export const ChevronLeftIcon: React.FC<IconProps> = ({ size = defaultProps.size, className }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
		aria-hidden="true"
	>
		<path d="m15 18-6-6 6-6" />
	</svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ size = defaultProps.size, className }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
		aria-hidden="true"
	>
		<path d="m9 18 6-6-6-6" />
	</svg>
);

export const ChevronFirstIcon: React.FC<IconProps> = ({ size = defaultProps.size, className }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
		aria-hidden="true"
	>
		<path d="m17 18-6-6 6-6" />
		<path d="M7 6v12" />
	</svg>
);

export const ChevronLastIcon: React.FC<IconProps> = ({ size = defaultProps.size, className }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
		aria-hidden="true"
	>
		<path d="m7 18 6-6-6-6" />
		<path d="M17 6v12" />
	</svg>
);

export const MaximizeIcon: React.FC<IconProps> = ({ size = defaultProps.size, className }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
		aria-hidden="true"
	>
		<path d="M8 3H5a2 2 0 0 0-2 2v3" />
		<path d="M21 8V5a2 2 0 0 0-2-2h-3" />
		<path d="M3 16v3a2 2 0 0 0 2 2h3" />
		<path d="M16 21h3a2 2 0 0 0 2-2v-3" />
	</svg>
);

export const MinimizeIcon: React.FC<IconProps> = ({ size = defaultProps.size, className }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
		aria-hidden="true"
	>
		<path d="M8 3v3a2 2 0 0 1-2 2H3" />
		<path d="M21 8h-3a2 2 0 0 1-2-2V3" />
		<path d="M3 16h3a2 2 0 0 1 2 2v3" />
		<path d="M16 21v-3a2 2 0 0 1 2-2h3" />
	</svg>
);

export const TableOfContentsIcon: React.FC<IconProps> = ({
	size = defaultProps.size,
	className,
}) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
		aria-hidden="true"
	>
		<path d="M16 5H3" />
		<path d="M16 12H3" />
		<path d="M16 19H3" />
		<path d="M21 5h.01" />
		<path d="M21 12h.01" />
		<path d="M21 19h.01" />
	</svg>
);

export const BookshelfIcon: React.FC<IconProps> = ({ size = defaultProps.size, className }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
		aria-hidden="true"
	>
		{/* Shelf */}
		<path d="M3 21h18" />
		{/* Books */}
		<rect x="4" y="7" width="3" height="14" rx="0.5" />
		<rect x="8" y="5" width="3" height="16" rx="0.5" />
		<rect x="12" y="9" width="3" height="12" rx="0.5" />
		<rect x="16" y="6" width="4" height="15" rx="0.5" />
	</svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ size = defaultProps.size, className }) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={size}
		height={size}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
		aria-hidden="true"
	>
		<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
		<polyline points="7 10 12 15 17 10" />
		<line x1="12" x2="12" y1="15" y2="3" />
	</svg>
);

export type { IconProps };
