import { SITE_DESCRIPTION, SITE_NAME } from "../constants";

/**
 * SEO options for the home route. `defaultDescription` guarantees a
 * `<meta name="description">` in the SSR HTML even when the CMS page carries no
 * `seo` block — see {@link SITE_DESCRIPTION}.
 */
export const HOME_SEO_OPTIONS = {
  defaultTitle: SITE_NAME,
  siteName: SITE_NAME,
  defaultDescription: SITE_DESCRIPTION,
};

type Head = { meta?: Record<string, string>[] };

/**
 * Adds `og:url` to the head built by `cmsHomeRouteConfig`, preserving every
 * other tag it emits (notably `description`). `cmsHomeRouteConfig` only adds
 * `og:url` when the page's SEO block sets an explicit canonical URL, so pages
 * without one (like the home, by default) lose the social preview when shared.
 */
export function withOgUrl(head: Head, pageUrl?: string): Head {
  const meta = head.meta ?? [];
  const hasOgUrl = meta.some((tag) => tag.property === "og:url");
  return {
    ...head,
    meta: hasOgUrl || !pageUrl ? meta : [...meta, { property: "og:url", content: pageUrl }],
  };
}
