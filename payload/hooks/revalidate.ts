import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from "payload";

/**
 * Payload runs inside the same Next runtime as the frontend, so we can call
 * `revalidateTag` directly instead of round-tripping through an HTTP endpoint.
 *
 * `next/cache` is a Next virtual subpath — it resolves inside the Next bundler
 * but NOT in the bare tsx process used by the Payload CLI (generate:types,
 * generate:importmap, migrate). We gate on NEXT_RUNTIME so CLI paths no-op.
 */

const isNextRuntime = Boolean(process.env.NEXT_RUNTIME);

const toMessage = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

const safeRevalidate = async (
  tag: string,
  logger: { error: (msg: string) => void },
) => {
  if (!isNextRuntime) return;
  try {
    const { revalidateTag } = await import("next/cache");
    // Next 16 signature: `revalidateTag(tag, profile)`; "default" matches the
    // cacheLife profile our queries use.
    revalidateTag(tag, "default");
  } catch (err: unknown) {
    logger.error(`revalidateTag failed for ${tag}: ${toMessage(err)}`);
  }
};

export const revalidateCollection =
  (tag: string): CollectionAfterChangeHook =>
  async ({ doc, req }) => {
    await safeRevalidate(tag, req.payload.logger);
    return doc;
  };

export const revalidateCollectionDelete =
  (tag: string): CollectionAfterDeleteHook =>
  async ({ doc, req }) => {
    await safeRevalidate(tag, req.payload.logger);
    return doc;
  };

export const revalidateGlobal =
  (tag: string): GlobalAfterChangeHook =>
  async ({ doc, req }) => {
    await safeRevalidate(tag, req.payload.logger);
    return doc;
  };
