export interface Props {
  title: string;
  /**
   * Heading level for the card title. Each call site declares the level that
   * fits its context so the document outline never skips a level: 3 inside a
   * shelf/grid owned by an h2, 2 when the card list is the first content under
   * the page h1, 4 under an aria-level=3 heading, and so on.
   * @default 3
   */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

export default function ProductCardTitle({ title, headingLevel = 3 }: Props) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4" | "h5" | "h6";

  return (
    <Heading className="line-clamp-1 text-sm font-medium text-ink-soft tracking-[-0.14px]">
      {title}
    </Heading>
  );
}
