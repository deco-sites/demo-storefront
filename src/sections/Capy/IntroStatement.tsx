/** IntroStatement (capybara redesign): one centred sentence and the collection tags. */
import { Tag } from "~/components/capy/Tag";

export interface Props {
  /** @title Statement */
  text: string;
  /** @title Collection tags */
  collections?: {
    /** @title Collection */
    handle: "sol" | "rio" | "onsen";
    /** @title Link */
    href: string;
  }[];
}

export default function IntroStatement({ text, collections = [] }: Props) {
  return (
    <div className="intro" data-section="IntroStatement">
      <div className="wrap rise">
        <p className="h2">{text}</p>
        {collections.length > 0 && (
          <nav className="intro-tags" aria-label="Collections">
            {collections.map((c) => (
              <a key={c.handle} href={c.href}>
                <Tag collection={c.handle} />
              </a>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
