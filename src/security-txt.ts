/**
 * RFC 9116 security.txt served at /.well-known/security.txt.
 *
 * Handled in the worker entry (see worker-entry.ts) instead of as a static
 * asset because the TanStack catch-all route (`src/routes/$.tsx`) answers
 * unknown paths with the CMS 404 page — HTML with `text/html`, which fails
 * security.txt validators.
 *
 * MANUAL REVIEW: `Expires` must stay in the future (RFC 9116 §2.5.5 —
 * recommended under a year out). Bump it, and the contact address, when the
 * site goes live under its own domain.
 */

/** Absolute date, must be refreshed before it passes. */
const EXPIRES = "2027-08-01T00:00:00.000Z";

const CONTACT = "mailto:security@deco.cx";

const CANONICAL = "https://demo-storefront.decocms.com/.well-known/security.txt";

const SECURITY_TXT = `Contact: ${CONTACT}
Expires: ${EXPIRES}
Canonical: ${CANONICAL}
Preferred-Languages: pt-BR, en
`;

export const SECURITY_TXT_PATH = "/.well-known/security.txt";

export const securityTxtResponse = () =>
  new Response(SECURITY_TXT, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
