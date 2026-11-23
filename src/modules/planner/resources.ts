import type { ResourceKind } from "./schema";

/**
 * Language models make up web addresses, so Ledge never shows a link the model wrote
 * (docs/plans-module-spec.md §4). A resource gets a search link instead: YouTube for a video
 * channel, a web search for anything else. A link the user pasted themselves is a different
 * thing and is kept in `PlanResource.url`.
 */
export function resourceSearchUrl(resource: { name: string; kind: ResourceKind }): string {
  const query = encodeURIComponent(resource.name.trim());
  return resource.kind === "video"
    ? `https://www.youtube.com/results?search_query=${query}`
    : `https://www.google.com/search?q=${query}`;
}
