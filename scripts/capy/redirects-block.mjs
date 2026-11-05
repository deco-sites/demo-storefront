/**
 * The site's one redirects block (the `redirects` built-in): every rule in one block, so routing
 * reads it in one fetch. legacy-redirects.mjs writes the legacy catalog's rules into it with
 * `withLegacyRules`, in the file `redirectsBlockFile` finds (`Redirects.json` when there is none).
 */

/** The block's file, under .deco/blocks, when the site has none yet: it is saved as `Redirects`. */
export const REDIRECTS_FILE = "Redirects.json";

/** The block types that are the redirects built-in: its name and its legacy alias. */
const REDIRECTS_TYPES = new Set(["redirects", "website/loaders/redirects.ts"]);

/** Old per-rule redirect blocks this script used to write, one file per rule. */
export const isLegacyRuleFile = (file) => file.startsWith("redirect-legacy-");

/**
 * The file of the site's redirects block among `blocks` (`[file, parsed body]` of each file in
 * .deco/blocks), `REDIRECTS_FILE` when there is none. Throws when there are several: the SDK
 * routes only the first by name, so the rules must be merged by hand first.
 */
export function redirectsBlockFile(blocks) {
  const found = blocks
    .filter(
      ([, body]) => body && typeof body === "object" && REDIRECTS_TYPES.has(body.__resolveType),
    )
    .map(([file]) => file)
    .sort();
  if (found.length > 1) {
    throw new Error(
      `several redirects blocks in .deco/blocks (${found.join(", ")}): merge their rules into one`,
    );
  }
  return found[0] ?? REDIRECTS_FILE;
}

const ruleOf = (rule) => (rule && typeof rule === "object" ? (rule.redirect ?? rule) : {});

/**
 * `existing` (the parsed redirects block, or undefined) with the legacy rules written:
 * - a rule from one of `froms` to `target` is this script's and is replaced, as is one from a page
 *   of the live catalog (`live`) to `target`, left by a run when that page was legacy;
 * - every other rule stays as it is, in order, and a path one of them already redirects gets no
 *   legacy rule (the earlier rule would win anyway);
 * - the legacy rules (sorted, unique) are added after the others. Other fields of the block are kept.
 * Returns the block, the legacy rules it holds and the legacy paths it skipped.
 */
export function withLegacyRules(existing, froms, target, live = []) {
  const block =
    existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
  const legacy = [...new Set(froms)].sort();
  const owned = new Set([...legacy, ...live]);
  const others = (Array.isArray(block.redirects) ? block.redirects : []).filter((rule) => {
    const { from, to } = ruleOf(rule);
    return !(to === target && owned.has(from));
  });
  const taken = new Set(others.map((rule) => ruleOf(rule).from));
  const rules = legacy
    .filter((from) => !taken.has(from))
    .map((from) => ({ from, to: target, permanent: false }));
  return {
    block: {
      ...block,
      __resolveType: block.__resolveType ?? "redirects",
      redirects: [...others, ...rules],
    },
    rules,
    skipped: legacy.filter((from) => taken.has(from)),
  };
}
