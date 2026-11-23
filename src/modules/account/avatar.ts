import type { AvatarType } from "@/server/db/schema/avatars";

/** The biggest photo you can pick (screen 9d). The crop sheet then shrinks it before sending. */
export const PICK_MAX_BYTES = 5 * 1024 * 1024;
/** The cropped square the browser sends: 256 by 256, so a few tens of KB. */
export const AVATAR_SIDE = 256;
/** What the server accepts after cropping. Far above a 256px WebP, far below anything abusive. */
export const AVATAR_MAX_BYTES = 256 * 1024;

export const PICKABLE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const TOO_LARGE = "That photo is over 5 MB. Try a smaller one.";
export const WRONG_TYPE = "Ledge can't use that file. Try a JPEG, PNG or WebP.";

/** Whether a picked file can go to the crop sheet, and if not, the line shown under the photo. */
export function checkPicked(file: { size: number; type: string }): string | null {
  if (!(PICKABLE_TYPES as readonly string[]).includes(file.type)) return WRONG_TYPE;
  if (file.size > PICK_MAX_BYTES) return TOO_LARGE;
  return null;
}

/**
 * What the bytes really are, from their first few bytes (never trust the file name or the type
 * the browser claims). Null for anything that is not a JPEG, PNG or WebP.
 */
export function sniffImage(bytes: Uint8Array): AvatarType | null {
  const at = (i: number, ...want: number[]) => want.every((b, j) => bytes[i + j] === b);
  if (bytes.length >= 3 && at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (bytes.length >= 8 && at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))
    return "image/png";
  // "RIFF" <size> "WEBP"
  if (bytes.length >= 12 && at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) {
    return "image/webp";
  }
  return null;
}

/** The address `user.image` holds while a photo is shown; the version makes browsers refetch. */
export function avatarUrl(version: number): string {
  return `/api/avatar?v=${version}`;
}

/** Only Ledge's own photo is shown: an account made with Google starts with Google's address in
 * `user.image`, which the page never loads (privacy, and the CSP allows only this site). */
export function shownAvatar(image: string | null | undefined): string | null {
  return image && image.startsWith("/api/avatar") ? image : null;
}

/** "Sam Rao" → "SR"; one word → its first letter; nothing → "?". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = [...words[0]][0] ?? "";
  const last = words.length > 1 ? ([...words[words.length - 1]][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * The square to cut from a photo of `width` by `height` for the crop sheet: `zoom` 1 shows the
 * whole short side, `offsetX` and `offsetY` (-1 to 1) slide it within what is left.
 */
export function cropSquare(
  width: number,
  height: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
): { x: number; y: number; side: number } {
  const side = Math.min(width, height) / Math.max(1, zoom);
  const spareX = width - side;
  const spareY = height - side;
  const clamp = (v: number) => Math.max(-1, Math.min(1, v));
  return {
    x: (spareX / 2) * (1 + clamp(offsetX)),
    y: (spareY / 2) * (1 + clamp(offsetY)),
    side,
  };
}
