import { Download } from "lucide-react";

/**
 * The round download button at the top right of a Summary report card (docs/design.md §5): a
 * plain link to the PDF route, so the browser downloads the file itself. 44px on phones.
 */
export function DownloadReport({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      download
      aria-label={label}
      title={label}
      className="-mt-1.5 -mr-1.5 grid size-11 shrink-0 place-items-center rounded-full bg-dash-well text-dash-ink outline-none transition-[transform,background-color] duration-150 ease-snap hover:bg-dash-edge focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 md:size-9"
    >
      <Download aria-hidden className="size-4" />
    </a>
  );
}
