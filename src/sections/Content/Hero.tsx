import type { Product } from "@decocms/apps-commerce/types";
import type { ImageWidget } from "~/types/widgets";
import Image from "~/components/ui/Image";
import { Link } from "@tanstack/react-router";
import { clx } from "~/sdk/clx";
import { useReveal } from "~/sdk/useReveal";
import { useOffer } from "@decocms/apps-commerce/sdk/useOffer";
import Slider from "~/components/ui/Slider";
import Icon from "~/components/ui/Icon";
import ProductCardPrice from "~/components/product/card/ProductCardPrice";
import { useId } from "react";

/** @titleBy label */
export interface HeroCategory {
  label: string;
  href: string;
  image: ImageWidget;
}

/** @titleBy headline */
export interface HeroSlide {
  /** @title Background image (desktop) */
  image: ImageWidget;
  /** @title Background image (mobile) */
  mobileImage?: ImageWidget;
  /** @title Link */
  href?: string;
  /** @title Headline (shown on mobile only) */
  headline?: string;
  /** @title Brand logo (desktop only) */
  logo?: ImageWidget;
  logoAlt?: string;
  /**
   * @title Product (desktop only)
   * @description This slide's product — shown as a nav thumbnail below the banner; clicking another slide's thumbnail jumps to that banner.
   */
  product?: Product[] | null;
}

export interface Props {
  /** @title Banner slides */
  slides: HeroSlide[];
  /** @title Category tiles */
  categories?: HeroCategory[];
  /** @title Info bullets */
  infoBullets?: string[];
  /**
   * @title Autoplay interval (seconds)
   * @description Leave empty to disable autoplay
   */
  interval?: number;
}

function CategoryTile({
  label,
  href,
  image,
  index = 0,
  disableReveal,
}: HeroCategory & { index?: number; disableReveal?: boolean }) {
  const ref = useReveal<HTMLAnchorElement>(0.15, disableReveal);
  return (
    <Link
      ref={ref}
      to={href}
      preload="intent"
      style={{ transitionDelay: `${Math.min(index, 4) * 60}ms` }}
      className={clx(
        disableReveal ? "" : "reveal",
        "group relative flex aspect-[496/498] w-64 shrink-0 items-end justify-start overflow-hidden rounded-sm p-4 sm:w-auto sm:flex-1",
      )}
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

/**
 * One nav thumbnail per slide — doubles as the carousel's slide indicator
 * (built on `Slider.Dot`, so clicking it jumps the carousel to that slide,
 * it never navigates to the product page). The slide currently in view
 * renders "disabled" by the slider's IntersectionObserver, which is when it
 * expands to show the product's name and price; every other slide's
 * thumbnail collapses to just its bare image.
 */
function HeroSlideNav({ product, index }: { product: Product; index: number }) {
  const { image: images, isVariantOf, offers } = product;
  const title = isVariantOf?.name ?? product.name ?? "";
  const { price, listPrice } = useOffer(offers);
  const img = images?.[0];

  return (
    <Slider.Dot
      index={index}
      disabled={index === 0}
      aria-label={title}
      className={clx(
        "flex shrink-0 items-center overflow-hidden rounded-sm text-left",
        "transition-[background-color,padding,gap] duration-(--duration-slow) ease-(--ease-out-soft)",
        "disabled:frost disabled:gap-3 disabled:p-2 disabled:pr-5",
      )}
    >
      <div
        className={clx(
          "size-24 shrink-0 overflow-hidden rounded-xs",
          "transition-[width,height,background-color] duration-(--duration-slow) ease-(--ease-out-soft)",
          "group-disabled:size-20 group-disabled:bg-white",
        )}
      >
        {img && (
          <Image
            src={img.url!}
            alt={img.alternateName ?? title}
            width={96}
            height={96}
            className="size-full object-cover"
            loading="lazy"
          />
        )}
      </div>
      <div className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-(--duration-slow) ease-(--ease-out-soft) group-disabled:grid-cols-[1fr]">
        <div className="flex min-w-0 flex-col gap-1.5 overflow-hidden opacity-0 transition-opacity duration-(--duration-base) ease-(--ease-out-soft) group-disabled:opacity-100 group-disabled:delay-75">
          <span className="text-2xs font-medium text-ink-soft whitespace-nowrap">Produto em destaque</span>
          <hr className="w-28 border-t border-ink-soft/20" />
          <span className="line-clamp-1 max-w-40 text-sm font-medium text-ink whitespace-nowrap">{title}</span>
          <ProductCardPrice price={price} listPrice={listPrice} currencyCode={offers?.priceCurrency} />
        </div>
      </div>
    </Slider.Dot>
  );
}

/** Desktop-only slide: full-bleed image and an optional brand logo. */
function DesktopSlide({ image, href = "/", logo, logoAlt }: HeroSlide) {
  return (
    <div className="relative size-full shrink-0 overflow-hidden rounded-md">
      <Link to={href} preload="intent" className="absolute inset-0 block">
        <Image
          src={image}
          alt={logoAlt ?? ""}
          width={1488}
          height={794}
          className="size-full object-cover"
          loading="lazy"
        />
      </Link>

      {logo && (
        <div className="pointer-events-none absolute top-8 left-8">
          <Image src={logo} alt={logoAlt ?? ""} width={160} height={64} className="h-10 w-auto object-contain" />
        </div>
      )}
    </div>
  );
}

export default function Hero({ slides, categories = [], infoBullets = [], interval }: Props) {
  const id = useId();
  const first = slides[0];
  const hasProductNav = slides.some((slide) => slide.product?.[0]);
  if (!first) return null;

  return (
    <div className="flex flex-col gap-2 px-3">
      <div className="flex h-screen flex-col gap-2 pt-17 pb-3 sm:pt-15">
        {/* Mobile: single full-screen hero photo + headline, unaffected by the desktop carousel. */}
        <Link
          to={first.href ?? "/"}
          preload="intent"
          className="relative block min-h-0 w-full flex-1 overflow-hidden rounded-md sm:hidden"
        >
          <Image
            src={first.mobileImage ?? first.image}
            alt={first.headline ?? ""}
            width={720}
            height={900}
            className="absolute inset-0 size-full object-cover"
            preload
          />

          {first.headline && (
            <div className="absolute inset-x-0 top-[40%] flex justify-center px-6 text-center">
              <span className="text-display font-semibold text-white">{first.headline}</span>
            </div>
          )}
        </Link>

        {/* Desktop: full carousel — each slide's own background, logo and featured products. */}
        <div className="hidden min-h-0 sm:flex sm:flex-1 sm:flex-col">
          <div id={id} className="relative min-h-0 flex-1">
            <Slider className="carousel carousel-center h-full w-full">
              {slides.map((slide, index) => (
                <Slider.Item key={slide.image} index={index} className="carousel-item h-full w-full">
                  <DesktopSlide {...slide} />
                </Slider.Item>
              ))}
            </Slider>

            {slides.length > 1 && (
              <>
                <div className="absolute inset-y-0 left-3 z-10 flex items-center">
                  <Slider.PrevButton
                    disabled={false}
                    className="tap-scale frost flex size-10 items-center justify-center rounded-full text-ink"
                  >
                    <Icon id="chevron-right" className="rotate-180" size={18} />
                  </Slider.PrevButton>
                </div>
                <div className="absolute inset-y-0 right-3 z-10 flex items-center">
                  <Slider.NextButton
                    disabled={false}
                    className="tap-scale frost flex size-10 items-center justify-center rounded-full text-ink"
                  >
                    <Icon id="chevron-right" size={18} />
                  </Slider.NextButton>
                </div>
                <div className="absolute bottom-6 left-6 z-10 flex items-stretch gap-3">
                  {hasProductNav
                    ? slides.map(
                        (slide, index) =>
                          slide.product?.[0] && (
                            <HeroSlideNav key={slide.image} product={slide.product[0]} index={index} />
                          ),
                      )
                    : slides.map((slide, index) => (
                        <Slider.Dot
                          key={slide.image}
                          index={index}
                          disabled={index === 0}
                          className="size-2 self-center rounded-full bg-white/60 transition-[width] disabled:w-6 disabled:bg-white"
                        />
                      ))}
                </div>
              </>
            )}
          </div>
          <Slider.JS rootId={id} interval={interval ? interval * 1000 : undefined} infinite />
        </div>

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
        <>
          <div className="hidden gap-3 sm:flex">
            {categories.map((category, index) => (
              <CategoryTile key={category.label} {...category} index={index} />
            ))}
          </div>

          <Slider className="carousel carousel-center gap-3 w-full sm:hidden">
            {categories.map((category, index) => (
              <Slider.Item key={category.label} index={index} className="carousel-item">
                <CategoryTile {...category} index={index} disableReveal />
              </Slider.Item>
            ))}
          </Slider>
        </>
      )}
    </div>
  );
}
