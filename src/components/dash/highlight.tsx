import { highlightParts } from "@/lib/search-text";

/**
 * Text with the search words marked (docs/new_design.md §4 "Command palette", screen 5a): weight
 * 600 and a 2px orange underline, so a match never rests on colour alone.
 */
export function Highlight({ text, words }: { text: string; words: string[] }) {
  return (
    <>
      {highlightParts(text, words).map((part, i) =>
        part.match ? (
          <mark
            key={i}
            className="bg-transparent font-semibold text-inherit underline decoration-dash-accent decoration-2 underline-offset-[3px]"
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}
