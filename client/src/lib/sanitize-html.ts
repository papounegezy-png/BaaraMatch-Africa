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
//
// Texte réel, pas du HTML échappé : les entités (&nbsp;, &amp;…) sont
// décodées, et une espace sépare les blocs (paragraphes, éléments de liste,
// titres) pour que « PROFIL RECHERCHÉ » et « Formation » ne se collent pas.
const BLOCS = "p, li, h1, h2, h3, h4, h5, h6, div, br, ul, ol, blockquote, tr";
export function stripJobDescriptionHtml(html: string): string {
  const fragment = DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true });
  fragment.querySelectorAll(BLOCS).forEach((bloc) => bloc.after(" "));
  return (fragment.textContent ?? "").replace(/\s+/g, " ").trim();
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
