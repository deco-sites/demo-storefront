/**
 * The versions a purge drops a path under (src/worker-entry.ts). A page is stored under the
 * revision it pins (`cacheVersion` with its URL): right after a publish, while the page's new
 * blocks load, that is the previous index. So a path is dropped under the revision its page pins
 * now and under the current one, which differ only in that window.
 */
import { cacheVersion } from "@decocms/tanstack/worker";

type VersionedCMS = Parameters<typeof cacheVersion>[0];

/** The page cache versions `url` can be stored under now: one, or two right after a publish. */
export async function purgeVersions(
  cms: VersionedCMS,
  buildHash: string,
  url: URL,
): Promise<string[]> {
  const versions = await Promise.all([
    cacheVersion(cms, buildHash, url),
    cacheVersion(cms, buildHash),
  ]);
  return [...new Set(versions)];
}
