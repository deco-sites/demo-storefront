import { ratingOf } from "~/sdk/capyRatings";

const STAR = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";

/** Average score in stars (rounded to the nearest half) and the review count, e.g. "4.5 (38)". */
export default function Stars({ handle, className = "" }: { handle: string; className?: string }) {
  const rating = ratingOf(handle);
  if (!rating) return null;
  const halves = Math.round(rating.average * 2);
  const score = rating.average.toFixed(1);
  return (
    <span
      className={`stars ${className}`.trim()}
      role="img"
      aria-label={`Rated ${score} out of 5 by ${rating.count} slow wanderers`}
    >
      <span className="stars-row" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.min(Math.max(halves - i * 2, 0), 2) * 50;
          return (
            <svg key={i} viewBox="0 0 24 24" width="14" height="14">
              <path d={STAR} className="stars-empty" />
              <path d={STAR} style={{ clipPath: `inset(0 ${100 - fill}% 0 0)` }} />
            </svg>
          );
        })}
      </span>
      <span className="stars-text" aria-hidden="true">
        {score} <span className="stars-count">({rating.count})</span>
      </span>
    </span>
  );
}
