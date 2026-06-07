import type { CSSProperties, ReactNode, SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "children" | "stroke"> & {
  size?: number;
  stroke?: number;
  style?: CSSProperties;
  children?: ReactNode;
};

export const Icon = ({ children, size = 20, stroke = 2, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {children}
  </svg>
);

export const IconSearch = (p: IconProps) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>;
export const IconUsers = (p: IconProps) => <Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icon>;
export const IconCash = (p: IconProps) => <Icon {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></Icon>;
export const IconCalendar = (p: IconProps) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Icon>;
export const IconUserPlus = (p: IconProps) => <Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></Icon>;
export const IconBeaker = (p: IconProps) => <Icon {...p}><path d="M9 3h6v6l4 9a2 2 0 0 1-2 3H7a2 2 0 0 1-2-3l4-9V3z" /><path d="M9 14h6" /></Icon>;
export const IconBox = (p: IconProps) => <Icon {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" /></Icon>;
export const IconPlus = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const IconDot3V = (p: IconProps) => <Icon {...p}><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></Icon>;
export const IconChev = (p: IconProps) => <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>;
export const IconChevR = (p: IconProps) => <Icon {...p}><path d="m9 18 6-6-6-6" /></Icon>;
export const IconChevL = (p: IconProps) => <Icon {...p}><path d="m15 18-6-6 6-6" /></Icon>;
export const IconFilter = (p: IconProps) => <Icon {...p}><path d="M3 6h18M6 12h12M10 18h4" /></Icon>;
export const IconPhone = (p: IconProps) => <Icon {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.93.37 1.84.71 2.71a2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 6 6l1.37-1.37a2 2 0 0 1 2.11-.45c.87.34 1.78.58 2.71.71A2 2 0 0 1 22 16.92Z" /></Icon>;
export const IconMail = (p: IconProps) => <Icon {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></Icon>;
export const IconHome = (p: IconProps) => <Icon {...p}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z" /></Icon>;
export const IconDroplet = (p: IconProps) => <Icon {...p}><path d="M12 2.5c4 5 7 8.5 7 12a7 7 0 1 1-14 0c0-3.5 3-7 7-12z" /></Icon>;
export const IconUser = (p: IconProps) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Icon>;
export const IconClipboard = (p: IconProps) => <Icon {...p}><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M9 7h6M9 11h6M9 15h4" /></Icon>;
export const IconStetho = (p: IconProps) => <Icon {...p}><path d="M6 2v6a4 4 0 0 0 8 0V2" /><path d="M6 2h3M11 2h3" /><path d="M10 12a6 6 0 0 0 6 6" /><circle cx="18" cy="18" r="3" /></Icon>;
export const IconTooth = (p: IconProps) => <Icon {...p}><path d="M12 2c2.5 0 5 1.5 5 4 0 1.5-.5 3-.5 5s.5 4 .5 6c0 2-1 5-2 5s-1.5-2-2-4-.5-3-1-3-.5 1-1 3-1 4-2 4-2-3-2-5 .5-4 .5-6-.5-3.5-.5-5c0-2.5 2.5-4 5-4z" /></Icon>;
export const IconBadge = (p: IconProps) => <Icon {...p}><circle cx="12" cy="8" r="6" /><path d="M16 13.5V22l-4-3-4 3v-8.5" /></Icon>;
export const IconFile = (p: IconProps) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 14h6M9 18h6M9 10h2" /></Icon>;
export const IconImage = (p: IconProps) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></Icon>;
export const IconTrash = (p: IconProps) => <Icon {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" /></Icon>;
export const IconCheck = (p: IconProps) => <Icon {...p}><path d="M20 6 9 17l-5-5" /></Icon>;
export const IconX = (p: IconProps) => <Icon {...p}><path d="M18 6 6 18M6 6l12 12" /></Icon>;
export const IconArrowRight = (p: IconProps) => <Icon {...p}><path d="M5 12h14M13 5l7 7-7 7" /></Icon>;
export const IconPrint = (p: IconProps) => <Icon {...p}><rect x="6" y="14" width="12" height="8" rx="1" /><path d="M6 8V2h12v6M6 14H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2" /></Icon>;
export const IconSettings = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .55.22 1.05.59 1.41.36.37.86.59 1.41.59H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Icon>;

export const IconLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2c3 0 6 2 6 5 0 1.6-.6 3.2-.6 5s.6 4 .6 6c0 2.5-1.2 6-2.5 6-1.1 0-1.5-2-2-4.2-.4-1.5-.6-2.8-1.5-2.8s-1.1 1.3-1.5 2.8C9.5 22 9 24 8 24c-1.3 0-2.5-3.5-2.5-6 0-2 .6-4 .6-6S5.5 8.6 5.5 7c0-3 3-5 6.5-5z" />
  </svg>
);
