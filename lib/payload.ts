import { getPayload as getPayloadLib } from "payload";
import config from "@/payload.config";

/**
 * Memoized Payload instance for Server Components.
 * Uses the local API — no HTTP round-trip, no public REST required.
 */
let cached: Promise<Awaited<ReturnType<typeof getPayloadLib>>> | null = null;

export const getPayload = () => {
  cached ??= getPayloadLib({ config });
  return cached;
};
