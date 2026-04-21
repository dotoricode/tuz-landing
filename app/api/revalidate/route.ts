import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Manual revalidate escape hatch.
 * Regular content updates go through Payload's `afterChange` hooks, which
 * call `revalidateTag` directly. This route is for operator-triggered busts
 * (e.g. cache inversion after a manual DB edit).
 *
 * Secret travels in the `x-revalidate-secret` header — query strings land in
 * access logs, this does not.
 */
const ALLOWED_TAGS = new Set([
  "notices",
  "menuItems",
  "todayPicks",
  "winners",
  "gallery",
  "settings",
  "storeHours",
  "location",
  "aboutStory",
]);

export async function POST(request: Request) {
  const secret = request.headers.get("x-revalidate-secret");
  const expected = process.env.REVALIDATE_SECRET;

  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "REVALIDATE_SECRET not configured" },
      { status: 503 },
    );
  }
  if (secret !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const tag = url.searchParams.get("tag");
  if (!tag || !ALLOWED_TAGS.has(tag)) {
    return NextResponse.json(
      { ok: false, error: "invalid or missing tag" },
      { status: 400 },
    );
  }

  revalidateTag(tag, "default");
  return NextResponse.json({ ok: true, tag });
}
