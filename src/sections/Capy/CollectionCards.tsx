/** CollectionCards (capybara redesign): one photo card per collection, with a bottom scrim. */
import { Ico } from "~/components/capy/Icons";
import Img from "~/components/capy/Img";
import { Tag } from "~/components/capy/Tag";
import type { CapyImage } from "~/components/capy/types";

export interface CollectionCard {
  /** @title Collection */
  collection: "sol" | "rio" | "onsen";
  /** @title Title */
  title: string;
  /** @title Link label */
  linkLabel: string;
  /** @title Link */
  href: string;
  /** @title Image */
  image: CapyImage;
}

export interface Props {
  /** @title Title */
  title?: string;
  /** @title Cards */
  cards?: CollectionCard[];
}

export default function CollectionCards({ title, cards = [] }: Props) {
  if (!cards.length) return null;
  return (
    <div className="colcards" data-section="CollectionCards">
      <div className="wrap">
        {title && (
          <div className="sec-head rise">
            <h2 className="h2">{title}</h2>
          </div>
        )}
        <div className="ccgrid">
          {cards.map((c) => (
            <a key={c.collection + c.href} className="ccard rise" href={c.href}>
              <Img image={c.image} sizes="(max-width: 900px) 80vw, 33vw" />
              <div className="cc-copy">
                <Tag collection={c.collection} />
                <h3 className="h3">{c.title}</h3>
                <span className="ulink on-dark">
                  {c.linkLabel} <Ico name="arrow" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
