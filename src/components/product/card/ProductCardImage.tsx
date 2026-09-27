import { Link } from "@tanstack/react-router";
import Image from "~/components/ui/Image";
import { clx } from "~/sdk/clx";

export interface Props {
  href: string;
  /** Product name — the card's visible title, reused as this link's accessible name. */
  name: string;
  frontUrl: string;
  frontAlt?: string;
  backUrl?: string;
  backAlt?: string;
  width: number;
  height: number;
  /** Eager-load the image (LCP) — distinct from `prefetch` (route preload). */
  preload?: boolean;
  /** Router preload strategy for the product link. */
  prefetch?: "intent" | false;
  inStock: boolean;
}

export default function ProductCardImage({
  href,
  name,
  frontUrl,
  frontAlt,
  backUrl,
  backAlt,
  width,
  height,
  preload,
  prefetch = "intent",
  inStock,
}: Props) {
  const aspectRatio = `${width} / ${height}`;
  return (
    <Link
      to={href}
      preload={prefetch}
      // The card's visible label is the product name, so the image link has to
      // announce it too — "view product" told screen reader and voice control
      // users nothing about which product they were on (WCAG 2.5.3).
      aria-label={name}
      className={clx(
        "absolute top-0 left-0",
        "grid grid-cols-1 grid-rows-1",
        "w-full",
        !inStock && "opacity-70",
      )}
    >
      <Image
        src={frontUrl}
        alt={frontAlt}
        width={width}
        height={height}
        style={{ aspectRatio }}
        className={clx("object-cover", "rounded w-full", "col-span-full row-span-full")}
        sizes="(max-width: 640px) 50vw, 20vw"
        preload={preload}
        loading={preload ? "eager" : "lazy"}
        decoding="async"
      />
      <Image
        src={backUrl ?? frontUrl}
        alt={backAlt ?? frontAlt}
        width={width}
        height={height}
        style={{ aspectRatio }}
        className={clx(
          "object-cover",
          "rounded w-full",
          "col-span-full row-span-full",
          "transition-opacity opacity-0 lg:group-hover:opacity-100",
        )}
        sizes="(max-width: 640px) 50vw, 20vw"
        loading="lazy"
        decoding="async"
      />
    </Link>
  );
}
