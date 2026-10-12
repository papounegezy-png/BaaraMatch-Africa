import { Client } from "@replit/object-storage";
import { randomUUID } from "crypto";

// The SDK's constructor kicks off an async sidecar handshake immediately and
// stores the promise without anyone awaiting it — if constructed at module
// load time (no Object Storage bucket provisioned, e.g. running outside
// Replit's own infra), that becomes an unhandled rejection that crashes the
// whole process before a single request comes in. Constructing it lazily,
// only inside the try/catch of an actual upload/download call, ensures the
// rejection is always awaited and caught like any other error.
let client: Client | null = null;
function getClient(): Client {
  if (!client) {
    client = new Client();
  }
  return client;
}

const MIME_EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

function extensionForMime(mimeType: string): string {
  return MIME_EXTENSIONS[mimeType] || "bin";
}

export function mimeForExtension(ext: string): string {
  const entry = Object.entries(MIME_EXTENSIONS).find(([, e]) => e === ext);
  return entry ? entry[0] : "application/octet-stream";
}

export type UploadCategory = "resumes" | "avatars" | "voice-cv" | "voice-application" | "company-logos" | "company-covers" | "candidate-documents" | "client-agreements";

/**
 * Uploads a file to Replit Object Storage and returns a URL the frontend can
 * use directly as-is (e.g. <img src>/<a href>/<audio src>), same as the
 * data: URLs this replaces. Throws if no Object Storage bucket is provisioned
 * for this Repl (Tools > Object Storage in the Replit workspace) or reachable
 * — callers should catch and fall back to inline base64 storage.
 */
export async function uploadToObjectStorage(
  category: UploadCategory,
  ownerId: string,
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  const key = `${category}/${ownerId}/${randomUUID()}.${extensionForMime(mimeType)}`;
  const result = await getClient().uploadFromBytes(key, buffer);
  if (!result.ok) {
    throw new Error(`Object storage upload failed: ${result.error.message}`);
  }
  return `/api/files/${key}`;
}

export async function downloadFromObjectStorage(key: string): Promise<Buffer> {
  const result = await getClient().downloadAsBytes(key);
  if (!result.ok) {
    throw new Error(`Object storage download failed: ${result.error.message}`);
  }
  return result.value[0];
}

export async function deleteFromObjectStorage(key: string): Promise<void> {
  const result = await getClient().delete(key);
  if (!result.ok) {
    throw new Error(`Object storage delete failed: ${result.error.message}`);
  }
}

const FILES_URL_PREFIX = "/api/files/";

/** Object-storage key behind an /api/files/... URL, or null for inline data: URLs. */
export function objectKeyFromUrl(url: string): string | null {
  return url.startsWith(FILES_URL_PREFIX) ? url.slice(FILES_URL_PREFIX.length) : null;
}

/**
 * Reads back a file stored by one of the upload routes, whichever of the two
 * storage modes it ended up in: an object-storage /api/files/... URL, or the
 * inline data: URL fallback used when no bucket is provisioned.
 */
export async function readStoredFile(url: string): Promise<Buffer> {
  const key = objectKeyFromUrl(url);
  if (key) {
    return downloadFromObjectStorage(key);
  }
  const match = url.match(/^data:[^;,]*;base64,([\s\S]*)$/);
  if (!match) {
    throw new Error("Unsupported stored file URL");
  }
  return Buffer.from(match[1], "base64");
}
