/** HeroScene (capybara redesign): the full-bleed night photo with the two-tone headline. */
import { Ico, Motif } from "~/components/capy/Icons";
import Img from "~/components/capy/Img";
import type { CapyImage, Cta } from "~/components/capy/types";

export interface Props {
  /** @title Image */
  image: CapyImage;
  /** @title Kicker */
  kicker?: {
    /** @title Motif */
    motif?: "ring" | "meander" | "quatre" | "petal";
    /** @title Text */
    text: string;
  };
  /** @title Headline */
  title: string;
  /** @title Headline, second tone (lime) */
  titleTone?: string;
  /** @title Lede */
  lede?: string;
  /** @title Primary button */
  primaryCta?: Cta;
  /** @title Secondary button */
  secondaryCta?: Cta;
  /** @title Weather pill */
  weather?: {
    /** @title City */
    city: string;
    /** @title Air (°C) */
    airC: number;
    /** @title Water (°C) */
    waterC: number;
  } | null;
}

export default function HeroScene({
  image,
  kicker,
  title,
  titleTone,
  lede,
  primaryCta,
  secondaryCta,
  weather,
}: Props) {
  return (
    <div className="hero-scene" data-section="HeroScene" aria-label={title}>
      <div className="hero-media">
        <Img image={image} eager sizes="100vw" />
      </div>
      <div className="wrap hero-copy">
        {kicker?.text && (
          <p className="kicker">
            {kicker.motif && <Motif name={kicker.motif} />}
            {kicker.text}
          </p>
        )}
        <h1 className="display">
          {title} {titleTone && <span className="tone">{titleTone}</span>}
        </h1>
        {lede && <p className="lede">{lede}</p>}
        {(primaryCta || secondaryCta) && (
          <div className="ctas">
            {primaryCta && (
              <a className="pill pill-lime" href={primaryCta.href}>
                {primaryCta.label} <Ico name="arrow" />
              </a>
            )}
            {secondaryCta && (
              <a className="pill pill-line on-dark" href={secondaryCta.href}>
                {secondaryCta.label}
              </a>
            )}
          </div>
        )}
      </div>
      {weather && (
        <div
          className="weather veil"
          aria-label={`${weather.city}, ${weather.airC} degrees, water ${weather.waterC} degrees`}
        >
          <Ico name="rain" />
          <span>
            {weather.city} · {weather.airC}°C
          </span>
          <span className="dot" />
          <Ico name="water" />
          <span>Water {weather.waterC}°C</span>
        </div>
      )}
    </div>
  );
}
