import { useId, type ReactNode } from "react";

/**
 * Filled twins of the phone tab bar's line icons (Lucide's House, ListChecks, Wallet and
 * NotebookPen), drawn on the same 24px grid so a tab swaps outline for solid when it is the
 * current page (O, 2026-11-15). Inner details (the door, the ticks, the clasp, the pen) are cut
 * out with a mask, so they read on any background in either theme.
 */
type Props = { className?: string; strokeWidth?: number };

function Solid({
  className,
  strokeWidth = 1.85,
  shape,
  holes,
  extra,
}: Props & { shape: ReactNode; holes: ReactNode; extra?: ReactNode }) {
  const id = useId();
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
        <g fill="#fff" stroke="#fff">
          {shape}
        </g>
        <g fill="#000" stroke="#000">
          {holes}
        </g>
      </mask>
      <rect width="24" height="24" mask={`url(#${id})`} stroke="none" />
      {extra}
    </svg>
  );
}

export function HouseFilled(props: Props) {
  return (
    <Solid
      {...props}
      shape={
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      }
      holes={<path d="M10 23v-7.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V23z" strokeWidth={1} />}
    />
  );
}

export function ListChecksFilled(props: Props) {
  return (
    <Solid
      {...props}
      shape={
        <>
          <circle cx="6" cy="7" r="3.75" strokeWidth={0.5} />
          <circle cx="6" cy="17" r="3.75" strokeWidth={0.5} />
          <path d="M13 5h8M13 12h8M13 19h8" fill="none" strokeWidth={2.4} />
        </>
      }
      holes={
        <path
          d="m4.25 7 1.25 1.25 2.5-2.5M4.25 17l1.25 1.25 2.5-2.5"
          fill="none"
          strokeWidth={1.6}
        />
      }
    />
  );
}

export function WalletFilled(props: Props) {
  return (
    <Solid
      {...props}
      shape={
        <>
          <path d="M5 7h15a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5a2 2 0 0 0 2 2z" />
          <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0-2 2" fill="none" />
        </>
      }
      holes={<path d="M18 11.5h4v5h-4a2.5 2.5 0 0 1 0-5z" strokeWidth={0.5} />}
      extra={<circle cx="18" cy="14" r="0.9" stroke="none" />}
    />
  );
}

export function NotebookPenFilled(props: Props) {
  const pen =
    "M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z";
  return (
    <Solid
      {...props}
      shape={<path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />}
      holes={
        <>
          <path d={pen} strokeWidth={4.5} />
          <path d="M4.9 6h2M4.9 10h2M4.9 14h2M4.9 18h2" fill="none" strokeWidth={1.6} />
        </>
      }
      extra={
        <>
          <path d={pen} />
          <path d="M2 6h2M2 10h2M2 14h2M2 18h2" fill="none" />
        </>
      }
    />
  );
}

/** The filled icon for each tab, by tab id (Home, then module ids). */
export const FILLED_TAB_ICONS: Record<string, (props: Props) => ReactNode> = {
  home: HouseFilled,
  todos: ListChecksFilled,
  expenses: WalletFilled,
  journal: NotebookPenFilled,
};
