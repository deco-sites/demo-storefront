import { Motif, type MotifName } from "./Icons";

/** The three collections' tag styles: tint pill, ink text, 12px motif. */
export const COLLECTIONS: Record<string, { label: string; tag: string; motif: MotifName }> = {
  sol: { label: "Sol", tag: "tag-sol", motif: "ring" },
  rio: { label: "Rio", tag: "tag-rio", motif: "meander" },
  onsen: { label: "Onsen", tag: "tag-ons", motif: "quatre" },
};

/** A collection handle the tags know. */
export type CollectionHandle = "sol" | "rio" | "onsen";

export function Tag({ collection, label }: { collection: string; label?: string }) {
  const c = COLLECTIONS[collection];
  if (!c) return label ? <span className="tag tag-new">{label}</span> : null;
  return (
    <span className={`tag ${c.tag}`}>
      <Motif name={c.motif} />
      {label ?? c.label}
    </span>
  );
}
