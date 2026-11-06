/**
 * The site's one redirects block (the `redirects` built-in): every rule in one block, so routing
 * reads it in one fetch. legacy-redirects.mjs writes the legacy catalog's rules into it, with the
 * rules of the old per-rule files folded in (`legacyFileRules`, `withLegacyRules`), in the file
 * `redirectsBlockFile` finds (`Redirects.json` when there is none).
 */

/** The block's file, under .deco/blocks, when the site has none yet: it is saved as `Redirects`. */
export const REDIRECTS_FILE = "Redirects.json";

/** The block types that are the redirects built-in: its name and its legacy alias. */
const REDIRECTS_TYPES = new Set(["redirects", "website/loaders/redirects.ts"]);

/** Old per-rule redirect blocks this script used to write, one file per rule. */
export const isLegacyRuleFile = (file) => file.startsWith("redirect-legacy-");

const isRedirectsBlock = (body) =>
  body && typeof body === "object" && REDIRECTS_TYPES.has(body.__resolveType);

/**
 * The file of the site's redirects block among `blocks` (`[file, parsed body]` of each file in
 * .deco/blocks), `REDIRECTS_FILE` when there is none. Throws when there are several: the SDK
 * routes only the first by name, so the rules must be merged by hand first. Throws too when there
 * is none and `REDIRECTS_FILE` holds a block of another type, which writing the rules would break.
 */
export function redirectsBlockFile(blocks) {
  const found = blocks
    .filter(([, body]) => isRedirectsBlock(body))
    .map(([file]) => file)
    .sort();
  if (found.length > 1) {
    throw new Error(
      `several redirects blocks in .deco/blocks (${found.join(", ")}): merge their rules into one`,
    );
  }
  if (found.length === 0 && blocks.some(([file]) => file === REDIRECTS_FILE)) {
    throw new Error(
      `.deco/blocks/${REDIRECTS_FILE} is not a redirects block: rename it, or create the redirects block`,
    );
  }
  return found[0] ?? REDIRECTS_FILE;
}

const ruleOf = (rule) => (rule && typeof rule === "object" ? (rule.redirect ?? rule) : {});

const sameRule = (a, b) => a.to === b.to && Boolean(a.permanent) === Boolean(b.permanent);

/**
 * The rules of the old per-rule files (`[file, parsed body]` of each `isLegacyRuleFile` file), by
 * file name, each as a rule of the redirects block: the body without its `__resolveType`. Throws on
 * a file without a `from` and a `to`, whose rule removing the file would lose.
 */
export function legacyFileRules(files) {
  return [...files]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([file, body]) => {
      const { __resolveType, ...rule } = body && typeof body === "object" ? body : {};
      if (typeof rule.from !== "string" || typeof rule.to !== "string") {
        throw new Error(`.deco/blocks/${file} has no from and to: fold its rule by hand`);
      }
      return { file, rule };
    });
}

/**
 * `existing` (the parsed redirects block, or undefined) with the legacy rules written:
 * - a rule from one of `froms` to `target` is this script's and is replaced, as is one from a page
 *   of the live catalog (`live`) to `target`, left by a run when that page was legacy;
 * - every other rule stays as it is, in order, and a path one of them already redirects gets no
 *   legacy rule (the earlier rule would win anyway);
 * - the rules of the old per-rule files (`folded`, from `legacyFileRules`) are folded in, one per
 *   path, after the block's other rules: one for a path of `froms` gives way to the catalog's rule
 *   (a `conflicts` entry when they differ), as does a second one for the same path; one for a path
 *   another rule of the block redirects, or from a live page to `target`, is `dropped`;
 * - the legacy rules (sorted, unique) are added last. Other fields of the block are kept.
 * Folded rules are the block's own on the next run, so a re-run writes the same block.
 * Returns the block, the legacy rules it holds, the legacy paths it skipped, the rules it folded,
 * and the old files' rules it did not fold, with the rule kept (`conflicts`) or why (`dropped`).
 */
export function withLegacyRules(existing, froms, target, live = [], folded = []) {
  const block =
    existing && typeof existing === "object" && !Array.isArray(existing) ? existing : {};
  const legacy = [...new Set(froms)].sort();
  const liveSet = new Set(live);
  const owned = new Set([...legacy, ...live]);
  const others = (Array.isArray(block.redirects) ? block.redirects : []).filter((rule) => {
    const { from, to } = ruleOf(rule);
    return !(to === target && owned.has(from));
  });
  const taken = new Set(others.map((rule) => ruleOf(rule).from));
  const rules = legacy
    .filter((from) => !taken.has(from))
    .map((from) => ({ from, to: target, permanent: false }));
  const catalog = new Map(rules.map((rule) => [rule.from, rule]));

  const kept = new Map();
  const conflicts = [];
  const dropped = [];
  for (const { file, rule } of folded) {
    const winner = catalog.get(rule.from) ?? kept.get(rule.from);
    if (winner) {
      if (!sameRule(rule, winner)) conflicts.push({ file, rule, kept: winner });
    } else if (taken.has(rule.from)) {
      dropped.push({ file, rule, reason: "another rule in the block redirects it" });
    } else if (rule.to === target && liveSet.has(rule.from)) {
      dropped.push({ file, rule, reason: "its page is in the live catalog" });
    } else {
      kept.set(rule.from, rule);
    }
  }

  return {
    block: {
      ...block,
      __resolveType: block.__resolveType ?? "redirects",
      redirects: [...others, ...kept.values(), ...rules],
    },
    rules,
    skipped: legacy.filter((from) => taken.has(from)),
    folded: [...kept.values()],
    conflicts,
    dropped,
  };
}
