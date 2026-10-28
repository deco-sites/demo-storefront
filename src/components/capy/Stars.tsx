import type { Rating } from "~/sdk/capyReviews";

const STAR = "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z";

/** Average score as five stars (rounded to the nearest half) and the review count, e.g. 4.5 (38). */
export default function Stars({ rating, className = "" }: { rating: Rating; className?: string }) {
  const half = Math.round(rating.average * 2) / 2;
  const avg = rating.average.toFixed(1);
  return (
    <span
      className={`stars ${className}`}
      role="img"
      aria-label={`Rated ${avg} out of 5 by ${rating.count} ${rating.count === 1 ? "capybara" : "capybaras"}`}
    >
      <span className="stars-row" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => {
          const fill = Math.max(0, Math.min(1, half - i));
          return (
            <svg key={i} viewBox="0 0 24 24" width="14" height="14">
              <path d={STAR} className="star-bg" />
              {fill > 0 && (
                <path d={STAR} className="star-on" style={{ clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` }} />
              )}
            </svg>
          );
        })}
      </span>
      <span className="stars-n" aria-hidden="true">
        {avg} <span className="stars-c">({rating.count})</span>
      </span>
    </span>
  );
}
