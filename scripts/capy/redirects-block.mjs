/**
 * The site's one redirects block (`.deco/blocks/Redirects.json`, the `redirects` built-in): every
 * rule in one block, so routing reads it in one fetch. legacy-redirects.mjs writes the legacy
 * catalog's rules into it with `withLegacyRules`.
 */

/** The block's file, under .deco/blocks: the redirects block is saved as `Redirects`. */
export const REDIRECTS_FILE = "Redirects.json";

/** Old per-rule redirect blocks this script used to write, one file per rule. */
export const isLegacyRuleFile = (file) => file.startsWith("redirect-legacy-");

const ruleTo = (rule) =>
  rule && typeof rule === "object" ? (rule.redirect?.to ?? rule.to) : undefined;

/**
 * `existing` (the parsed Redirects.json, or undefined) with the legacy rules replaced: every rule
 * that sends to `target` is this script's and is dropped, the rules for `froms` (sorted, unique) are
 * added after the others, which stay as they are, in order. Other fields of the block are kept.
 */
export function withLegacyRules(existing, froms, target) {
  const block =
    existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
  const others = (Array.isArray(block.redirects) ? block.redirects : []).filter(
    (rule) => ruleTo(rule) !== target,
  );
  const legacy = [...new Set(froms)].sort().map((from) => ({ from, to: target, permanent: false }));
  return {
    ...block,
    __resolveType: block.__resolveType ?? "redirects",
    redirects: [...others, ...legacy],
  };
}
