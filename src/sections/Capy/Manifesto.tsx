/** Manifesto (capybara redesign): a 4:5 photo beside the brand's manifesto. */
import { Ico } from "~/components/capy/Icons";
import Img from "~/components/capy/Img";
import type { CapyImage, Cta } from "~/components/capy/types";

export interface Props {
  /** @title Image */
  image: CapyImage;
  /** @title Caption */
  caption?: string;
  /** @title Title */
  title: string;
  /**
   * @title Body
   * @format textarea
   */
  body?: string;
  /** @title Link */
  link?: Cta;
}

export default function Manifesto({ image, caption, title, body, link }: Props) {
  return (
    <div className="manifesto" data-section="Manifesto">
      <div className="wrap mgrid">
        <figure className="rise">
          <Img image={image} sizes="(max-width: 900px) 100vw, 50vw" />
          {caption && <figcaption>{caption}</figcaption>}
        </figure>
        <div className="text rise">
          <h2 className="h2">{title}</h2>
          {body && <p className="body-l">{body}</p>}
          {link && (
            <a className="ulink" href={link.href}>
              {link.label} <Ico name="arrow" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
