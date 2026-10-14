/** SizingStory (capybara redesign): the three sizes labelled under a photo of three capybaras. */
import { Ico } from "~/components/capy/Icons";
import Img from "~/components/capy/Img";
import type { CapyImage, Cta } from "~/components/capy/types";

export interface SizeLabel {
  /** @title Size */
  name: string;
  /** @title Weight */
  weight: string;
  /** @title Girth */
  girth?: string;
  /**
   * @title Position
   * @description Centre of the label, in % of the image width.
   */
  x: number;
  /** @title House model badge (e.g. "Tião, 48 kg") */
  model?: string;
}

export interface Props {
  /** @title Title */
  title: string;
  /** @title Body */
  body?: string;
  /** @title Image */
  image: CapyImage;
  /** @title Labels */
  labels?: SizeLabel[];
  /** @title Button */
  cta?: Cta;
  /** @title Anchor */
  anchor?: string;
}

export default function SizingStory({
  title,
  body,
  image,
  labels = [],
  cta,
  anchor = "sizing",
}: Props) {
  return (
    <div className="sizing" id={anchor} data-section="SizingStory">
      <div className="wrap head rise">
        <h2 className="h2">{title}</h2>
        {body && <p className="body">{body}</p>}
      </div>
      <div className="pan">
        <figure className="herd">
          <Img image={image} sizes="100vw" />
          {labels.length > 0 && (
            <ul className="size-labels">
              {labels.map((l) => (
                <li key={l.name} style={{ "--x": `${l.x}%` } as React.CSSProperties}>
                  <span className="nm">{l.name}</span>
                  <span className="sp">{l.weight}</span>
                  {l.girth && <span className="sp">{l.girth}</span>}
                  {l.model && <span className="model">{l.model}</span>}
                </li>
              ))}
            </ul>
          )}
        </figure>
      </div>
      {cta && (
        <div className="wrap foot">
          <a className="pill pill-line" href={cta.href}>
            {cta.label} <Ico name="arrow" />
          </a>
        </div>
      )}
    </div>
  );
}
