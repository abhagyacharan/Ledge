import { Download } from "lucide-react";

/**
 * The "PDF" download pill at the top right of a Summary report card (docs/design.md §5): a
 * plain link to the PDF route, so the browser downloads the file itself. 44px on phones.
 */
export function DownloadReport({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      download
      aria-label={label}
      title={label}
      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-dash-well px-3.5 text-[13px] font-medium text-dash-ink outline-none transition-[transform,background-color] duration-150 ease-snap hover:bg-dash-edge focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 md:h-8"
    >
      <Download aria-hidden className="size-3.5" />
      <span aria-hidden>PDF</span>
    </a>
  );
}
