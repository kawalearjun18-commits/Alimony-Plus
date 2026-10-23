/**
 * SHA-256 watermark utility for settlement reports.
 * Uses the Web Crypto API (available in all modern browsers and Node ≥ 15).
 * The short ID is the first 8 hex characters of the full hash.
 */

const encoder = new TextEncoder();

export async function sha256(data: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function shortId(hash: string): string {
  return hash.slice(0, 8);
}

/**
 * Build the canonical string that is hashed.  Deterministic so the same
 * inputs always produce the same watermark.
 */
export function canonicalise(input: Record<string, unknown>): string {
  return JSON.stringify(input, Object.keys(input).sort());
}
