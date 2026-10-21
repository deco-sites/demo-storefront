import type { CSSProperties } from "react";
import { srcSetOf } from "~/sdk/capyProduct";
import type { CapyImage } from "./types";

/**
 * An editable image with its srcset. The focal point goes through CSS variables (`--pos`,
 * `--pos-m`) so a phone focal point can differ from the desktop one (src/styles/capy.css).
 */
export default function Img({
  image,
  sizes = "100vw",
  eager = false,
  width = 2688,
  height = 1792,
  className,
  style,
}: {
  image?: CapyImage;
  sizes?: string;
  eager?: boolean;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
}) {
  if (!image?.src) return null;
  const vars = {
    ...(image.position && { "--pos": image.position }),
    ...(image.positionMobile && { "--pos-m": image.positionMobile }),
    ...style,
  } as CSSProperties;
  return (
    <img
      className={className}
      style={vars}
      src={image.src}
      srcSet={srcSetOf(image.src)}
      sizes={sizes}
      width={width}
      height={height}
      alt={image.alt ?? ""}
      {...(eager
        ? { fetchPriority: "high" as const, loading: "eager" as const }
        : { loading: "lazy" as const, decoding: "async" as const })}
    />
  );
}
