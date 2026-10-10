/** JournalCards (capybara redesign): three Riverbank notes, as photo cards or a type card. */
import { Ico } from "~/components/capy/Icons";
import Img from "~/components/capy/Img";
import type { CapyImage, Cta } from "~/components/capy/types";

export interface Post {
  /** @title Category */
  category?: string;
  /** @title Title */
  title: string;
  /** @title Dek */
  dek?: string;
  /** @title Link */
  href?: string;
  /** @title Photo */
  image?: CapyImage;
  /**
   * @title Photo zoom
   * @description 1 = fit. Zooms around the focal point.
   */
  scale?: number;
  /**
   * @title Type card
   * @description Used instead of a photo when set.
   */
  type?: {
    /** @title Big number */
    big: string;
    /** @title Unit */
    unit?: string;
    /** @title Caption */
    caption?: string;
  };
}

export interface Props {
  /** @title Title */
  title: string;
  /** @title Dek */
  dek?: string;
  /** @title Link */
  link?: Cta;
  /** @title Posts */
  posts?: Post[];
  /** @title Anchor */
  anchor?: string;
}

export default function JournalCards({
  title,
  dek,
  link,
  posts = [],
  anchor = "riverbank",
}: Props) {
  return (
    <div className="journal" id={anchor} data-section="JournalCards">
      <div className="wrap">
        <div className="sec-head rise">
          <div>
            <h2 className="h2">{title}</h2>
            {dek && <p className="sec-dek">{dek}</p>}
          </div>
          {link && (
            <div className="tools">
              <a className="ulink" href={link.href}>
                {link.label} <Ico name="arrow" />
              </a>
            </div>
          )}
        </div>
        <div className="jgrid">
          {posts.map((post) => (
            <a
              key={post.title}
              className={`jcard rise${post.type ? " jcard-type" : ""}`}
              href={post.href || "#"}
            >
              {post.type ? (
                <div className="ph type">
                  <p className="big">
                    {post.type.big}
                    {post.type.unit && <span>{post.type.unit}</span>}
                  </p>
                  {post.type.caption && <p className="cap">{post.type.caption}</p>}
                  <div className="bars" aria-hidden="true">
                    <i style={{ "--w": 1 } as React.CSSProperties} />
                    <i style={{ "--w": 1.4 } as React.CSSProperties} />
                    <i style={{ "--w": 1.8 } as React.CSSProperties} />
                  </div>
                </div>
              ) : (
                <div className="ph">
                  <Img
                    image={post.image}
                    sizes="(max-width: 900px) 80vw, 33vw"
                    style={
                      post.scale && post.scale !== 1
                        ? {
                            transform: `scale(${post.scale})`,
                            transformOrigin: post.image?.position ?? "50% 50%",
                          }
                        : undefined
                    }
                  />
                </div>
              )}
              {post.category && <p className="cat">{post.category}</p>}
              <h3 className="h3">{post.title}</h3>
              {post.dek && <p className="dek">{post.dek}</p>}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
