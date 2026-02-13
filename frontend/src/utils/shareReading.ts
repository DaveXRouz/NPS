/**
 * Share link utilities — create and resolve share URLs.
 */

import { share } from "@/services/api";
import type { ShareLink } from "@/types";

export async function createShareLink(
  readingId: number,
  expiresInDays?: number,
): Promise<ShareLink> {
  return share.create(readingId, expiresInDays);
}

export function getShareUrl(token: string): string {
  return `${window.location.origin}/share/${token}`;
}
