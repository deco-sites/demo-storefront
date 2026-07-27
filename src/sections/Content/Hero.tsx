import type { ImageWidget } from "~/types/widgets";
import Image from "~/components/ui/Image";
import { Link } from "@tanstack/react-router";
import { clx } from "~/sdk/clx";
import { useReveal } from "~/sdk/useReveal";

/** @titleBy label */
export interface HeroCategory {
  label: string;
  href: string;
  image: ImageWidget;
}

export interface Props {
  /** @title Background image (desktop) */
  image: ImageWidget;
  /** @title Background image (mobile) */
  mobileImage?: ImageWidget;
  /** @title Headline */
  headline?: string;
  /** @title Link */
  href?: string;
  /** @title Category tiles */
  categories?: HeroCategory[];
  /** @title Info bullets */
  infoBullets?: string[];
}

function CategoryTile({ label, href, image, index = 0 }: HeroCategory & { index?: number }) {
  const ref = useReveal<HTMLAnchorElement>();
  return (
    <Link
      ref={ref}
      to={href}
      preload="intent"
      style={{ transitionDelay: `${Math.min(index, 4) * 60}ms` }}
      className="reveal group relative flex aspect-[496/498] flex-1 items-end justify-start overflow-hidden rounded-sm p-4"
    >
      <Image
        src={image}
        alt={label}
        width={496}
        height={498}
        className="absolute inset-0 size-full object-cover transition-transform duration-(--duration-slow) ease-(--ease-out-soft) group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 from-55% to-black/30" />
      <span className="relative text-display font-medium text-white">{label}</span>
    </Link>
  );
}

export default function Hero({
  image,
  mobileImage,
  headline,
  href = "/",
  categories = [],
  infoBullets = [],
}: Props) {
  return (
    <div className="flex flex-col gap-2 px-3">
      <div className="flex h-screen flex-col gap-2 pt-15 pb-3">
        <Link
          to={href}
          preload="intent"
          className="relative block min-h-0 w-full flex-1 overflow-hidden rounded-md"
        >
          <Image
            src={mobileImage ?? image}
            alt={headline ?? ""}
            width={720}
            height={900}
            className="absolute inset-0 size-full object-cover sm:hidden"
            preload
          />
          <Image
            src={image}
            alt={headline ?? ""}
            width={1488}
            height={794}
            className="absolute inset-0 hidden size-full object-cover sm:block"
            preload
          />

          {headline && (
            <div className="absolute inset-x-0 top-[40%] flex justify-center px-6 text-center">
              <span className="text-display font-semibold text-white sm:text-[26px]">{headline}</span>
            </div>
          )}
        </Link>

        {infoBullets.length > 0 && (
          <div className="frost flex items-center gap-6 overflow-x-auto rounded-sm px-3 py-3 sm:justify-between sm:overflow-visible">
            {infoBullets.map((bullet) => (
              <span
                key={bullet}
                className="shrink-0 text-sm font-normal tracking-[-0.12px] text-ink whitespace-nowrap"
              >
                • {bullet}
              </span>
            ))}
          </div>
        )}
      </div>

      {categories.length > 0 && (
        <div className={clx("flex gap-3", "flex-row")}>
          {categories.map((category, index) => (
            <CategoryTile key={category.label} {...category} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
