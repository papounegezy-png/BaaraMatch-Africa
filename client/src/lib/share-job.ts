export type SharePlatform = "facebook" | "whatsapp" | "linkedin" | "messenger" | "x";

function shareText(job: { title: string; organizationName?: string | null }): string {
  return job.organizationName ? `${job.title} — ${job.organizationName}` : job.title;
}

// Standard share-intent URLs — no app registration needed for any of these
// (Messenger's dialog/send flow requires a registered Facebook App ID we
// don't have, so it uses the fb-messenger:// deep link instead, same as a
// "Share to Messenger" button on a page with no Facebook app behind it;
// it opens the app on mobile and is a normal dead link on desktop, which is
// the honest, expected behavior without that app registration).
export function getPlatformShareUrl(platform: SharePlatform, job: { title: string; organizationName?: string | null }, url: string): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(shareText(job));
  switch (platform) {
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case "whatsapp":
      return `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    case "messenger":
      return `fb-messenger://share/?link=${encodedUrl}`;
    case "x":
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
  }
}

export function openPlatformShare(platform: SharePlatform, job: { title: string; organizationName?: string | null }, url: string): void {
  const shareUrl = getPlatformShareUrl(platform, job, url);
  window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=500");
}

export async function copyJobLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
