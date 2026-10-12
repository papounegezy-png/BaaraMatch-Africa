import DOMPurify from "dompurify";

// Restricted to exactly what RichTextEditor can produce. Used everywhere a
// job description is rendered to a viewer other than the author (candidate
// pages, previews) — never render job.description with
// dangerouslySetInnerHTML without going through this first, even though the
// only source is an authenticated recruiter/admin using RichTextEditor.
const ALLOWED_TAGS = ["p", "strong", "em", "u", "h2", "ul", "ol", "li", "a"];
const ALLOWED_ATTR = ["href", "target", "rel"];

export function sanitizeJobDescriptionHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}

// For truncated list-preview snippets (line-clamp cards) — rendering actual
// HTML there looks broken once clamped mid-list, and un-sanitized HTML would
// show literal "<p>...</p>" tags as text. Strips all tags via the same
// DOMPurify parser (safe against malformed/malicious markup) and keeps only
// the text content.
export function stripJobDescriptionHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

// Seed/test jobs in the database carry this filler as their whole
// description. The data stays untouched; previews just show nothing rather
// than present it to a real candidate.
const PLACEHOLDER_DESCRIPTIONS = new Set(["mission de démonstration"]);

/** Text preview of a job description, or null when there's nothing real to show. */
export function jobDescriptionPreview(html: string | null | undefined): string | null {
  const text = stripJobDescriptionHtml(html ?? "").trim();
  if (!text || PLACEHOLDER_DESCRIPTIONS.has(text.toLowerCase())) return null;
  return text;
}
